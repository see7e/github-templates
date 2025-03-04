// module.exports = async ({ github, context }) => {
/**
 * GitHub Action to automatically label pull requests based on modified files.
 *
 * @param {Object} params - The parameters for the action.
 * @param {Object} params.github - The GitHub API object.
 * @param {Object} params.context - The context of the GitHub Action.
 * @param {Object} params.context.repo - The repository context.
 * @param {string} params.context.repo.owner - The owner of the repository.
 * @param {string} params.context.repo.repo - The name of the repository.
 * @param {Object} params.context.issue - The issue context.
 * @param {number} params.context.issue.number - The pull request number.
 *
 * @returns {Promise<void>} A promise that resolves when the action is complete.
 */
export default async ({ github, context }) => {
    let newCompLbls = new Set(); // Set of new label strings

    // Fetch files modified in the PR
    const pulledFiles = await github.rest.pulls.listFiles({
        owner: context.repo.owner,
        repo: context.repo.repo,
        pull_number: context.issue.number,
    });

    // Identify labels based on file paths
    for (const f of pulledFiles.data) {
        switch (true) {
            case /^ci-scripts\/.*/.test(f.filename):
                console.log("CI-related file changed: " + f.filename);
                newCompLbls.add("component: ci");
                newCompLbls.add("component: ci-scripts");
                break;

            case /^\.github\/workflows\/.*/.test(f.filename):
                console.log("CI-related file changed: " + f.filename);
                newCompLbls.add("component: ci");
                newCompLbls.add("component: workflows");
                break;
            
            case /^third_party\/build\/.*/.test(f.filename):
                console.log("Third party file changed: " + f.filename);
                newCompLbls.add("component: orc8r");
                break;

            case /^docs\/.*/.test(f.filename):
                console.log("Docs-related file changed: " + f.filename);
                newCompLbls.add("component: docs");
                break;
        }
    }

    const curLblObjs = await github.rest.issues.listLabelsOnIssue({
        issue_number: context.issue.number,
        owner: context.repo.owner,
        repo: context.repo.repo,
    });

    // Remove outdated labels and keep only new ones
    for (const l of curLblObjs.data) {
        if (l.name.startsWith("component: ")) {
            if (newCompLbls.has(l.name)) {
                newCompLbls.delete(l.name);
            } else {
                await github.rest.issues.removeLabel({
                    issue_number: context.issue.number,
                    owner: context.repo.owner,
                    repo: context.repo.repo,
                    name: l.name,
                });
            }
        }
    }

    if (newCompLbls.size > 0) {
        let uniqLbls = Array.from(newCompLbls);
        await github.rest.issues.addLabels({
            issue_number: context.issue.number,
            owner: context.repo.owner,
            repo: context.repo.repo,
            labels: uniqLbls,
        });
    } else {
        console.log("No new component files changed in this PR.");
    }
};
