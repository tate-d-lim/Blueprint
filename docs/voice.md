# Blueprint voice

How Blueprint writes headings, buttons, descriptions and messages. Use it for every string in `app/` and `lib/plan/`, and for new plain-language control text.

## Who reads it

- **App Builders.** Developers and tech leads at CPFB. They are good at code and new to security paperwork. On day 0 they want to know what is theirs. Two weeks later they want to tick things off fast. Many will hand the plan to a coding agent, so the words must be exact enough for a machine too.
- **Platform tool owners.** They know their tool well. They want to record what it covers without retyping a spreadsheet.
- **Admins.** They decide whether a claim is true. They want to see what changed and who said so.

None of them came to Blueprint for fun. They came to finish a task with no surprises. The voice serves that.

## Lessons from other products

These are the pages and the writing guides of products that these readers already use or trust.

| Product | What it does well | What Blueprint takes | What Blueprint leaves |
|---|---|---|---|
| GOV.UK writing guide and design system | Headings that say what the reader can do ("Check if you can claim"). Buttons that say what happens ("Save and continue" only when it saves). No negative contractions. | Task headings. Honest buttons. "cannot", "do not". | Nothing. This is the base. |
| GitHub Primer | Sentence case. Buttons start with a verb. Errors say what to enter, not "Field required". No humour in errors. | The whole button rule. Helpful error text. | — |
| Vercel design guidelines | Numerals for counts ("8 deployments"). One word for one thing. Errors say how to recover. Buttons name the outcome ("Save API Key", not "Continue"). | Numerals with their noun. Fixed terms. Recovery in every error. | Title Case. Blueprint uses sentence case. |
| Atlassian voice and tone | Tone changes with the moment: calm for errors, direct for warnings, light for success. | The tone table below. | Celebration. A finished security task is a relief, not a party. |
| Linear docs | One concept, one line: "Issues are the fundamental unit of work." | Definitions in one short sentence. | — |
| Stripe docs | A link that starts with a verb, then one line that says what you get ("Get your API keys: Get your API keys and learn about authentication"). | Verb-first links with a one-line description. | — |
| Isomer and FormSG (GovTech) | Short, confident claims about speed and compliance. | Confidence about what is true. | Hype ("easily", "simply"). Those words are not true for a builder with 17 tasks. |
| Vanta, Drata, Snyk | Clear product names for each job. | Nothing more. | Marketing voice: "Mission Control", "Unleash", "on autopilot". Drata uses one metaphor everywhere until the real meaning is lost. Blueprint's hotel should never do that. |

## The voice in four words

1. **Plain.** Short words, short sentences, one idea in each sentence. Most sentences have fewer than 20 words. Write in the style of ASD-STE100 Simplified Technical English: active voice, present tense, and one meaning for each word.
2. **Direct.** Say the fact first, then the action. Speak to the reader as "you" and about their app as "your app".
3. **Honest about who says so.** Each claim names its source: the tool ("appCentral says this one is yours"), GovTech, or the reader's own answers. Blueprint does not say "we". "We" hides who makes the claim. Blueprint names itself only when it says what it can and cannot plan.
4. **Calm.** No hype, no alarm and no jokes. Security work is serious, and it is also normal work. Write about it as a colleague who has done it before.

## Tone by moment

| Moment | Tone | Example |
|---|---|---|
| Start of a task | Short and clear about the effort | "Answer 4 questions about risk. It takes about a minute." |
| A result | The fact first, in a full sentence | "Blueprint can plan your app." |
| Progress | Numbers, no praise | "9 of 17 tasks done" |
| Empty | Say why it is empty and what to do, if anything | "No questions. Your tools and answers cover everything." |
| Warning | The result of the action, before the action | "Your app type changes from Low-Risk Cloud to …" |
| Error | What failed, then how to fix it. Never blame the reader. | "Your changes were not saved. Check the server is running, then try again." |
| Success | One short line, only if it changes what to do next | "Saved" |

## Rules by element

### Headings

- Use sentence case. Do not put a full stop after a label heading ("What you need to do").
- A heading that gives a result is a full sentence with a full stop ("Your plan is ready. 17 controls are yours, and your tools do 66.").
- Say what the section is for, from the reader's side: "What your app needs", not "Controls".
- Put the most important word first.

### Buttons

- Start with a verb. Then name the object when the result is not obvious: "Save this plan", "Prompt your agent", "Start a new plan".
- The words say what happens, not the gesture: not "Click here", not "Submit", "OK" or "Yes".
- Use "Save" only when the button saves. A button that only moves forward in the journey is "Next: <the next step's name>". Use this for every forward step, the last step included ("Next: your plan").
- Use "you" and "your", never "my".
- Use the same button words for the same action on every page ("Start a new plan" on the list and in the empty state).

### Links

- The link text makes sense alone: "Change answers", "Change tools", "Read the official wording".
- For a link with a description, start the description with a verb.

### Descriptions and help text

- Answer the question the reader has now. Do not repeat the label.
- One or two sentences. If a sentence needs "and" twice, make two sentences.
- Say how long a step takes when the reader cannot see it ("It takes about a minute").

### Form questions and options

- A question is a full question with a question mark, about "your app" ("What is the highest classification of data in your app?").
- An option description says what the option means in daily words ("Some private details, such as names and contact details.").
- Help text that tells the reader what to do if they are not sure ends with who to ask.

### Numbers and counts

- Use numerals for all counts: "4 questions", "17 tasks".
- A count in a sentence has its noun: "17 controls are yours". In a short label, the noun can go if the screen names it close by ("6 yours" under a part of the hotel).
- Use the singular and the plural correctly: "1 task", "2 tasks".

### Statuses and verification

These words are fixed. Do not change them or use other words for them:

- Verified · Not yet verified · Published by GovTech · Sample
- To do · In progress · Done
- Applies · Does not apply

### The hotel

- The hotel is a guide, not a second language. Each part always shows its hotel name and its real name together: "CCTV · Logging".
- In sentences, buttons and errors, use the real name ("Logging"), not the hotel name alone.
- Do not add more hotel words to the copy. The picture does that work.

### Errors

Each error answers three questions, in this order:

1. What failed?
2. Why, if Blueprint knows?
3. What can the reader do now?

Do not show internal codes as the message. Do not guess a cause that Blueprint cannot know.

## Words

### Use these words

| Use | For |
|---|---|
| your app | The thing the builder makes. Not "the app", "the system" or "this app". |
| control | One security item from IM8. The word the guides and the BRM use. Not "requirement". |
| System Security Plan (SSP) | The plan of controls for one app. Write it in full the first time on a screen, then "SSP" or "security plan". |
| IM8 | Name it with its full title the first time: "IM8, the Singapore Government's Instruction Manual for ICT and Smart Systems". |
| task | A control that is yours to do. |
| question | A control that needs an answer first. |
| your tools | The CPF and GovTech tools the builder picks. |
| pick | Choose tools ("the tools you picked"). |
| tick | A checkbox ("Tick what is true"). |
| choose | One answer from a list. |
| App Builder | The role. Never "Agency". |
| cannot, do not, does not, is not | Never "can't", "don't", "doesn't", "isn't". GOV.UK found that negative contractions are harder to read. Do not use other contractions either ("what's", "you'll"). |

### Do not use these words

| Do not use | Because | Use |
|---|---|---|
| OSCAL, agency (on builder screens) | Builders do not need the file format, and CPFB builders are not an agency. | the export's name, App Builder |
| requirement (for one security item) | Blueprint uses the same word as IM8 and the BRM. | control |
| will use, before you build, to build (steps 1 to 5) | The app can be new, part built or built. | "your app", "part of your app" |
| must, obey, have to | They read as orders. Builders should feel guided, not policed. | should, comply with, recommended |
| we, us, our | It hides who makes the claim. | The tool's name, GovTech, "your answers", or Blueprint |
| easily, simply, just, quick | They are not true for every reader. | Say the real effort ("about a minute") |
| straight away, carry on, take off, left off, rule out | Phrasal verbs and idioms have more than one meaning, and do not translate well. | at once, continue, do for you, stopped, remove |
| Something went wrong (alone) | It says nothing the reader can use. | Say what failed and what to do |
| Nothing here | It does not say why. | Say why the list is empty |
| Submit, OK, Yes, Click here | They do not say what happens. | A verb and an object |

## Before and after

| Before | After | Rule |
|---|---|---|
| A few questions, so we can work out which security requirements apply. | Answer 4 questions about risk. Your answers decide which security controls apply. | No "we". Say the effort. |
| Work out my app type | Find your app type | "your", not "my". |
| You can plan this app with Blueprint. | Blueprint can plan your app. | The fact first. "your app". |
| We leave out the requirements that can't apply to your app, and we tell you which ones. | Your plan leaves out the controls that cannot apply, and lists them. | No "we". No contractions. |
| Could take more off you | Could do more for you | No phrasal verbs. |
| Continue to your plan | Next: your plan | One pattern for forward steps. |
| Your plan is ready. 17 are yours, and your tools do 66. | Your plan is ready. 17 controls are yours, and your tools do 66. | A count in a sentence has its noun. |
| We can't tell from your tools. Check these with the right person. | Your tools do not answer these. Find out if each one applies to your app, then record the answer. | No "we". Say the action. |
| Nothing here. | No questions. Your tools and answers cover everything. | Say why it is empty. |
| Take your plan out of the app. | Download your plan as files. | Say what happens. |

## Check before you ship a string

1. Is the fact first?
2. Is it in sentence case, with no contraction?
3. Does every claim name who says so?
4. Does a button start with a verb and say what happens?
5. Does every count have its noun, or a noun close by?
6. Does it use only the words in the word list for fixed things?
7. Is every sentence shorter than 20 words, with one idea?
8. If it is an error, does it say what to do now?
