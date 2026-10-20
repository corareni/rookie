// Name, pitch and links in one place. Switch LANDING to "B" only once the AI features are live.
export const LANDING = "B" as "A" | "B";

export const site = {
  name: "Rookie",
  oneLiner:
    "Rookie helps students applying to 10+ internships track every application from the job link on one board.",
  github: "https://github.com/corareni/rookie",
  author: "Cora Affeld, IE University",
};

export const landing = {
  A: {
    headlineStart: "Every internship application on",
    headlineEm: "one board.",
    headlineEnd: "Just paste the job link.",
    sub: "For students applying to 10+ internships. Track deadlines, statuses and replies in one place, so nothing slips through.",
  },
  B: {
    headlineStart: "Paste a job link. Get an",
    headlineEm: "honest",
    headlineEnd: "score, a tailored CV and cover letter.",
    sub: "For students applying to 10+ internships. Rookie reads the job, scores your chances out of 10, writes your application from your real experience, and tracks every application on one board.",
  },
}[LANDING];
