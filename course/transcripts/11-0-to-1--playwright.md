# Playwright

- class: slack-agents
- chapter: 0 to 1
- title: Playwright
- url: https://www.agenticcoding.school/v/LAY83oC-
- durationSeconds: 264
- fetched: 2026-09-05
- transcriptChars: 4459

## Description (video page text, NOT transcript; may contain links)

The prompt:
```
Hey. Can you set up Playwright on for yourself for all future instances, all future sandboxes? You should basically be able to spawn up a local Next.js server, take screenshots, do recordings, and send them to me over Slack. But first, also verify you can send recordings to me over Slack directly from the sandbox rather than passing through—I think Vercel has some kind of limit to how big of a file you can send.

Set this up for me and ask me any clarifying questions. Also test it by sending me a test recording. And then also save a set of instructions for yourself so you can do this faster next time using Playwright properly.
```

## Transcript

Okay, so now we want to set up Playwright for our Slack agent. So you

can basically use a browser to verify changes, especially when

we make changes to any of our applications.

And it can take screenshots and send us recordings and stuff like that.

So we're going to set it up by simply telling joestar and being

like, hey, can you set up Playwright on for yourself for

all future instances, all future sandboxes? You should

basically be able to spawn up a local like Next.js

server. Take screenshots, do recordings, and send them

to me over Slack. But first also verify you can send

recordings to me over Slack directly from the sandbox rather than passing

through Vercel, because I think Vercel has some kind of like limit

to how big of a file you can send. Set this up for me and

ask me any clarifying questions and also test it by sending me a test recording.

And then also save a set of instructions for yourself so

you can do this faster next time. Now, of course, this prompt will be down

below so you can copy it over and then give it to your own agent

too. So I'm going to press enter over here. But yeah, this will now go

through the process of setting up Playwright. And this is what I do for basically

all my applications. I have a task lifecycle where at the

very end of the task, it will actually verify all the changes and send me

recordings of it actually verifying the changes by using Playwright.

Okay, so I had to move into a brand new apartment, which is why the

background is a bit different now. But we can see that it's now done.

So I won't read through the entire response over here.

But essentially what it did is it sent me some test recordings.

So there is a test-recording.webm.

So this is like a video file format. And if I were to play this

recording over here, you can see it made a test website and it clicks this

button and the count is now going up. But of course we can't see the

cursor because it doesn't really use a cursor to move around. When using Playwright.

And then you can see it made a screenshot over here as well. Now,

one of the issues that it says that it ran into is that there seems

to be an 8 megabyte, 8 megabyte file

upload limit because currently any output is passed into

the Vercel function's memory, which is why there's a small file upload limit.

So I should tell JoeStart to change that. And it says

over here, do you want me to build a single-use-upload

URL approach? And this is what question number 1 is about over here.

I want to raise this 8 megabyte cap limit for now because

it may send me a longer recording in the future. And you will find that

if the, if the file limit is not big enough, then it will send like

really weird compressed files instead, which can be a bit hard to

see. It then said that it opened up a brand new PR where it put

Playwright and Chromium into the sandbox template.

So this is a PR that it opened up for me over here,

and these are the files that it changed. So we can see that over

here it installed Playwright with the Chromium dependencies. And then

finally it says, do you want to use Chromium only or do you also want

to use Firefox or WebKit? And I'll stick to Chromium only. So what I

did after this is I basically like gave it answers to questions.

It made some updates, it opened up a brand new PR, and then I quickly

went for another flow where I tested it to make sure everything is working.

And it basically tested everything and it sent me some more recordings over here.

So you can see this is one recording that it made me with Playwright,

which is like much bigger because there's a lot more objects moving around.

And then this is a screenshot that I sent over as well. So this is

now working. And of course the source code for this will be down below.

And you may not want to use Playwright either. You may prefer using a

different agent browser, kind of like Vercel's own agent-browser,

because some of them may have features that Playwright doesn't have available.

Or just may make it easier to do certain actions. So in

which case, if you are planning on using agent-browser or Playwright or another like tool

similar to them, you may want to ask ChatGPT or Claude to basically

do some research, find a comparison table, and recommend which one would

be most beneficial for your project based on the differences.

But I personally like using Playwright for now. Anyways, this is now great because

now we can tell Claude when it's running on Slack being

like, hey, can you verify that the feature works? And then send me a recording

of it working as well. So we can be more confident in actually shipping this.

In the next video, we will follow a very similar approach and

also install Postgres onto the cloud container that is running.
