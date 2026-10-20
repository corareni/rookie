// Name, pitch and links in one place. Switch LANDING to "B" only once the AI features are live.
export const LANDING: "A" | "B" = "A";

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
    headlineStart: "Paste a job link. Get a",
    headlineEm: "tailored",
    headlineEnd: "CV and cover letter, and track every application on one board.",
    sub: "For students applying to 10+ internships. Rookie reads the job, researches the company and writes both from your real experience.",
  },
}[LANDING];
