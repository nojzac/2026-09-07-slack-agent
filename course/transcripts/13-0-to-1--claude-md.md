# CLAUDE md

- class: slack-agents
- chapter: 0 to 1
- title: CLAUDE md
- url: https://www.agenticcoding.school/v/24gq8gCO
- durationSeconds: 178
- fetched: 2026-09-05
- transcriptChars: 3110

## Description (video page text, NOT transcript; may contain links)

(none)

## Transcript

Okay, so one thing that you want to make sure that you have with your

Slackbot is basically a Claude.md file or an Agents.md file.

So you will see that it may have already made one for you,

but if it hasn't, you want to get it to make one. And in my

case, there's an Agents.md file with the Claude.md file symlinked

to the Agents.md file. So you can see this little arrow over here means that

it's a symlink. Now we want to quickly check that this is loading properly.

Inside of our agent so we can get it to tell us some additional details.

So I'm going to add at the very top to the agents.md file. So I

will add at the very top of this, you are JoeStar, an agent that runs

inside of your own cloud sandbox and interacts with the user as

a Slack bot. So I'm going to commit and push this and

then check that it's working properly by then making a

request and getting it to complete the line. So we can go over and say,

is this... loaded in your context

window automatically? So we can see that it's not being loaded in for some reason

because it says that no, nothing like that appears in my system prompt or context,

which means that we have to tag the claude-code-guide and then paste

in the screenshot and basically say, hey, for some reason this claude.md

file, AGENTS.md file is not being loaded in. Can you figure out why? Give me

a few solutions here and I'll tell you which one to recommend. So the reason

that I'm using it inside of a terminal is because I want to make this

claude-code-guide subagent apparent, which basically loads

in information from the Claude Code docs. But of course you can also trigger

this via Slack as well. And now I basically found the root cause of the

issue and it gives us a couple of recommendations. So I'm going to go

for approach 3 over here where it's written

to the user root. So I'm going to say do 3.

And then we can press Enter. As for when JoeStar, our agent,

clones a GitHub repo, then there will be many .claude.md

files inside of a GitHub repo as well. And when it's editing different

files, then it will load them in automatically. So we don't have to worry about

the .claude.md files for any GitHub repos that we're using. It will load in them

automatically. And if you are a little bit confused by that,

then I would recommend watching the video about nested .claude.md files that

will be linked down below. But basically we don't have to worry about the cloud.md

files for particular projects that's cloning from GitHub for us. But we do have to

worry about it for the main joestar-agent project that we have. So you

can see it's now making these changes over here where we'll automatically write

these files over. And then once it's done, I'm going to push those changes and

then test it again. So I'll say commit push deploy test for

me, press enter. All right, so then I got the Claude Code session to test

it out. Doing an end-to-end test, and it basically worked over here.

So you can see it sent a new message being like, is it loaded automatically?

And it said, yes, it's loaded automatically. Now we will be doing something very

similar in the next video when it comes to skills. So skills

that we want our JoeStar, our Slackbot agent to have

by default.
