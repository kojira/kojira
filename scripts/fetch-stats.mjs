const TOKEN = process.env.GITHUB_TOKEN;
if (!TOKEN) {
  console.error('GITHUB_TOKEN is required');
  process.exit(1);
}

const USERNAME = 'kojira';
const currentYear = new Date().getUTCFullYear();

async function graphql(query, variables = {}) {
  const res = await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: {
      Authorization: `bearer ${TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query, variables }),
  });
  if (!res.ok) throw new Error(`GitHub API error: ${res.status} ${await res.text()}`);
  const json = await res.json();
  if (json.errors) throw new Error(`GraphQL errors: ${JSON.stringify(json.errors)}`);
  return json.data;
}

// Fetch user stats
const statsQuery = `
query($login: String!, $from: DateTime!, $to: DateTime!) {
  user(login: $login) {
    repositories(first: 100, ownerAffiliations: OWNER, orderBy: {field: STARGAZERS, direction: DESC}) {
      totalCount
      nodes {
        stargazerCount
        languages(first: 10, orderBy: {field: SIZE, direction: DESC}) {
          edges {
            size
            node { name color }
          }
        }
      }
    }
    contributionsCollection(from: $from, to: $to) {
      totalCommitContributions
      totalPullRequestContributions
      totalIssueContributions
      totalRepositoriesWithContributedCommits
    }
    pullRequests(first: 1) { totalCount }
    issues(first: 1) { totalCount }
    repositoriesContributedTo(first: 1, contributionTypes: [COMMIT, ISSUE, PULL_REQUEST]) { totalCount }
  }
}`;

const from = `${currentYear}-01-01T00:00:00Z`;
const to = new Date().toISOString();

const data = await graphql(statsQuery, { login: USERNAME, from, to });
const user = data.user;
const contrib = user.contributionsCollection;

// Total stars
const totalStars = user.repositories.nodes.reduce((sum, r) => sum + r.stargazerCount, 0);

// Aggregate languages
const langMap = new Map();
for (const repo of user.repositories.nodes) {
  for (const edge of repo.languages.edges) {
    const name = edge.node.name;
    const existing = langMap.get(name) || { size: 0, color: edge.node.color || '#6e7681' };
    existing.size += edge.size;
    langMap.set(name, existing);
  }
}

const totalSize = [...langMap.values()].reduce((s, l) => s + l.size, 0);
const languages = [...langMap.entries()]
  .sort((a, b) => b[1].size - a[1].size)
  .slice(0, 5)
  .map(([name, { size, color }]) => ({
    name,
    color,
    percentage: Math.round((size / totalSize) * 1000) / 10,
  }));

// If top languages don't sum to 100%, add "Others"
const topSum = languages.reduce((s, l) => s + l.percentage, 0);
if (topSum < 100) {
  languages.push({
    name: 'Others',
    color: '#6e7681',
    percentage: Math.round((100 - topSum) * 10) / 10,
  });
}

const result = {
  totalStars,
  commits: contrib.totalCommitContributions,
  prs: user.pullRequests.totalCount,
  issues: user.issues.totalCount,
  contributedTo: user.repositoriesContributedTo.totalCount,
  year: currentYear,
  languages,
};

console.log(JSON.stringify(result, null, 2));
