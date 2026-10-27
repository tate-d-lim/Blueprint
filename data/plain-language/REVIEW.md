# Plain-language review: the 20 items builders act on

Claude drafted plain text for all 118 Low-Risk Cloud requirements (and the 8 GenAI ones) in `low-risk-cloud.json` and `generative-ai.json` in this folder.
These 20 are the ones builders act on, so they need your eye. Edit the JSON, then run `npm run seed` (or use "Reset demo data").

Check each row for: is it accurate to the official wording, does a builder know what to do, and is the reason honest?

## What you need to do (11)

| ID | Official title | Plain title | What to do | Why it matters |
|---|---|---|---|---|
| as-1 | Input Validation | Check every input before you use it | Validate every input your app receives against the type, format and length you expect, and reject anything else. | Unchecked input is how attackers inject code or crash your app, which can lead to unauthorised access or an outage. |
| as-2 | Parameterised Interfaces | Use parameterised queries, never string-built ones | Pass user values to the database and to system commands as parameters (for example through an ORM), never by joining strings together. | Joining user input into a query lets an attacker change what the query does, which can expose or alter your data. |
| as-3 | Output Sanitisation | Escape output before it reaches the browser | Sanitise or escape every value you put into an HTML page so the browser shows it as text and never runs it as code. | Unescaped output lets an attacker run their own script in your users' browsers (cross-site scripting). |
| as-7 | Access Control Check Enforcement | Check permissions on every request | Check on the server that the signed-in user is allowed to do what each request asks, using a shared filter or middleware. | Skipping these checks lets one user read or change another user's data. |
| as-9 | Content Security Policy (CSP) | Set a Content Security Policy | Send a strict Content Security Policy header that allows only the scripts, styles and images your app needs. | A strict policy stops injected scripts from loading, which limits the damage from cross-site scripting. |
| sc-4 | Dependency Manifest Version Pinning | Pin your dependency versions | Pin exact versions of your direct and indirect dependencies in the manifest, and commit the lock file. | Unpinned versions can change silently and bring in bugs or malicious code. |
| sc-6 | Dependency Installation during Deployment | Install only pinned versions when you deploy | Make your deployment install exactly the versions pinned in your lock file, nothing newer. | A deploy that picks the latest version can pull in changes nobody reviewed. |
| st-4 | Security Testing Programme | Get your app security-tested every year | Have your app penetration-tested, or put it through a bug bounty, by an internal or independent team at least every 365 days, and keep the report. | Testers find weaknesses that normal reviews miss. |
| st-5 | Vulnerability Management | Fix vulnerabilities within the deadlines | Triage every vulnerability and fix it, or formally accept the risk, within the deadline for its severity. | Known weaknesses left unfixed are the easiest way into your system. |
| cs-3 | Runtime Container Secrets | Pass secrets to containers at run time | Provide secrets to the container when it runs, and never bake them into the image at build time. | Secrets baked into an image can be pulled out by anyone who has the image. |
| cs-4 | Non-Privileged Container User | Don't run containers as root | Create a non-root user in the image and make it the default user. | If the app is compromised, a non-root user limits what the attacker can do. |

## Questions to answer (9)

| ID | Official title | Plain title | Question | Why it matters |
|---|---|---|---|---|
| pm-1 | Cybersecurity Incident Management Plan | Have a plan for cyber incidents | Does your organisation already have a cybersecurity incident plan that covers this app? | When something goes wrong, a ready plan saves hours. |
| pm-2 | Risk Assessment | Assess the risks before launch | Has a risk assessment been written and approved for this app, and by whom? | It surfaces risks while they are cheap to fix. |
| pm-3 | System Security Plan (SSP) Development | Write your security plan | Is someone already writing the security plan for this app, or is it on you? | It is the record that reviewers and future teammates rely on. |
| pm-4 | Approval of Residual Risks | Get leftover risks formally accepted | Who in your organisation has to accept the leftover risks for this app, and have they? | Someone with authority must own the risks you can't remove. |
| pm-5 | Central Submission of Approved System Security Plan (SSP) | Submit the approved security plan centrally | Has the approved security plan been submitted to the central repository, and who does that? | It gives government a view of security across all systems. |
| pm-6 | System Documentation | Keep your system documentation up to date | Is the documentation for this app kept up to date, and where does it live? | Good documentation is essential for running and securing the system. |
| is-11 | Central Domain Name Registration | Register your domain through GovTech | Does your app use a .gov.sg or .edu.sg domain, and is it registered with GovTech? | Properly registered domains are harder to hijack or fake. |
| is-14 | Singapore SMS Sender ID Registry Registration | Register your SMS sender ID | Will your app send SMS to members of the public? If so, is your sender ID registered? | It stops scammers spoofing government SMS. |
| is-15 | Official URL shorteners | Use only go.gov.sg for short links | Will your app share shortened links? If so, are you using go.gov.sg? | Official short links tell people a link is genuine. |
