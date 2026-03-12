const TOKEN = process.env.GH_TOKEN;
if (!TOKEN) {
  console.error('GH_TOKEN is required');
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
    followers { totalCount }
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
      restrictedContributionsCount
      totalPullRequestContributions
      totalPullRequestReviewContributions
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
langMap.delete('Jupyter Notebook');

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

// --- Rank calculation ---
function exponential_cdf(x) {
  return 1 - 2 ** -x;
}

function log_normal_cdf(x) {
  if (x <= 0) return 0;
  return 0.5 * (1 + erf((Math.log(x) - 0) / (1 * Math.SQRT2)));
}

function erf(x) {
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;
  const sign = x < 0 ? -1 : 1;
  x = Math.abs(x);
  const t = 1.0 / (1.0 + p * x);
  const y = 1.0 - ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
  return sign * y;
}

function calculateRank({ commits, prs, issues, reviews, stars, followers }) {
  const COMMITS_MEDIAN = 250, COMMITS_WEIGHT = 2;
  const PRS_MEDIAN = 50, PRS_WEIGHT = 3;
  const ISSUES_MEDIAN = 25, ISSUES_WEIGHT = 1;
  const REVIEWS_MEDIAN = 2, REVIEWS_WEIGHT = 1;
  const STARS_MEDIAN = 50, STARS_WEIGHT = 4;
  const FOLLOWERS_MEDIAN = 10, FOLLOWERS_WEIGHT = 1;

  const TOTAL_WEIGHT = COMMITS_WEIGHT + PRS_WEIGHT + ISSUES_WEIGHT + REVIEWS_WEIGHT + STARS_WEIGHT + FOLLOWERS_WEIGHT;

  const score =
    (COMMITS_WEIGHT * exponential_cdf(commits / COMMITS_MEDIAN)) +
    (PRS_WEIGHT * exponential_cdf(prs / PRS_MEDIAN)) +
    (ISSUES_WEIGHT * exponential_cdf(issues / ISSUES_MEDIAN)) +
    (REVIEWS_WEIGHT * exponential_cdf(reviews / REVIEWS_MEDIAN)) +
    (STARS_WEIGHT * log_normal_cdf(stars / STARS_MEDIAN)) +
    (FOLLOWERS_WEIGHT * log_normal_cdf(followers / FOLLOWERS_MEDIAN));

  const normalizedScore = score / TOTAL_WEIGHT;

  const THRESHOLDS = [
    { level: 'S+', threshold: 0.95 },
    { level: 'S',  threshold: 0.90 },
    { level: 'A++', threshold: 0.85 },
    { level: 'A+', threshold: 0.80 },
    { level: 'A',  threshold: 0.70 },
    { level: 'B+', threshold: 0.60 },
    { level: 'B',  threshold: 0.45 },
    { level: 'C+', threshold: 0.30 },
    { level: 'C',  threshold: 0.15 },
  ];

  let level = 'C';
  for (const t of THRESHOLDS) {
    if (normalizedScore >= t.threshold) {
      level = t.level;
      break;
    }
  }

  return { level, score: normalizedScore };
}

const commits = contrib.totalCommitContributions + contrib.restrictedContributionsCount;
const reviews = contrib.totalPullRequestReviewContributions;
const followers = user.followers.totalCount;

const rank = calculateRank({
  commits,
  prs: user.pullRequests.totalCount,
  issues: user.issues.totalCount,
  reviews,
  stars: totalStars,
  followers,
});

const result = {
  totalStars,
  commits,
  prs: user.pullRequests.totalCount,
  issues: user.issues.totalCount,
  reviews,
  followers,
  contributedTo: user.repositoriesContributedTo.totalCount,
  rank,
  year: currentYear,
  languages,
};

console.log(JSON.stringify(result, null, 2));
