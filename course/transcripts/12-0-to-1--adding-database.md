# Adding Database

- class: slack-agents
- chapter: 0 to 1
- title: Adding Database
- url: https://www.agenticcoding.school/v/dgdGPuOl
- durationSeconds: 407
- fetched: 2026-09-05
- transcriptChars: 6303

## Description (video page text, NOT transcript; may contain links)

(none)

## Transcript

Okay. Now in the last video, we set up Playwright inside of our cloud

sandbox. So our agent in the cloud could do recordings for

us of any changes that it made and then send them to us via Slack,

kind of like this right over here. So where it's like sending me a recording

of it, like clicking this button and the click count increasing over time.

Now, of course we want it to do more useful things such as editing our

applications and then verifying those changes actually work.

And sending us recordings. But for our applications, wherever they are deployed,

they're probably using some kind of database. So for example, my application

agentstack uses PlanetScale behind the scenes, their Postgres

database that they offer here for the database engine Postgres.

But if I were to make a change with our current agent right now,

it wouldn't be able to verify that change because it doesn't have Postgres

installed on the container. So if you were to go over

to code that we have so far, we have some kind of like template

file. So this is template.js and you can see over here,

there's a template name, uh, from Node version 24.

It installs a bunch of commands. It then installs, uh,

Git, GitHub CLI over here. It also installs Claude

Code, then Playwright as we talked about in the last video and then Chromium as

well. We also want it to install any dependencies that are required to

make our project run. And all of this is installed inside of a sandbox

image. So for example, every time you could tell it like,

hey, use Playwright, and if it doesn't have installed, then it will reinstall

it. And that can take some time to reinstall every single time. So it's

better that we package it up inside of the sandbox. So any future sandboxes

always have Playwright installed, and that is by making a

sandbox image so we can add additional things to our

sandbox image. And then all future sandboxes will be running on that

particular image. We can actually see this image inside of e2b.dev.

If we did go to e2b.dev right now, go to sign in,

um, and then you can see it says templates over here.

And then I have the one that I made over here a couple days ago.

So this is the one that we made. So I want to install,

uh, Postgres onto this. So it's much better to do this locally

because we're going to be building the image as well, and our actual

sandbox doesn't have enough memory and capacity to build

a sandbox image. So I'm going to go to my local

version of Joestar and then I'm going to say, hey,

for the sandbox template, can you add Postgres and also Redis

and then build the sandbox image and deploy it?

And then also make sure all future sandboxes are using this new template.

And then that will add those two dependencies. Now this means

that if we have Postgres installed on the sandbox, for the database,

then if our cloud agent via Slack were

to make some kind of change, then it would

then be able to edit the database directly, verify by actually checking the

database, run any queries as well. So for example, let's say we made

a change and it requires like 4 different accounts in some kind of way.

Claude would automatically be able to seed the database which exists

inside of a sandbox, in the right configuration to verify

that change and then send us a recording of that instead.

You could also do something else whereby if your sandbox is too small

to contain Postgres, you could have it automatically spin up a

server online which is running Postgres and then automatically

close that as well once it's done using it.

But for me, I will have Postgres on the same sandbox rather than on

a different server. So anyway, I'm going to wait until it's done.

And then we should see inside this file, it will

say something like Postgres and also Redis. And then if we went

to /e2b.dev again, we would see an updated template right over here. Alright,

so we can see that's working right over here. So it edited the template

and it added a brand new line for Postgres with

a DEFAULT_ROOT_USER and

then also redis-server as well. So that will be running inside of the sandbox.

And then it added a default DATABASE_URL and REDIS_URL.

And now finally it's saying it wants to run the template build command.

So all feature sandboxes can use this template, but it needs an

API key from E2B. So I will give it an API

key from E2B. And then after this, I will commit, push it to main,

and then we can test it out. So now you can see it's running the

build command over here. So that may take a while. Okay. So it seems I

was actually a little bit wrong earlier because I said the build happens

locally for the template image, but it actually happens on e2b.dev's

own cloud system. So you can see this build is happening right over here

for the new template image and it's installing the relevant things and so forth.

So this may take a little while to do, but this means

that we could give our own agent, Joestar, the ability to

make new template images. And then use them for all future sandboxes.

So I'm going to wait for the sandbox image build to complete.

But you may want to do this for other things as well. So for example,

if you do a lot of development with Cloudflare Workers, then you may want to

install Wrangler onto your sandbox image. And that means

that all future instances can quickly boot up and work on the task because they

already have Wrangler installed locally. Okay, so Claude now added

Postgres and Redis to the template. It actually went back and forth

a few times with e2b.dev because it kept failing

over here. And then it basically realized it made a wrong assumption.

And then the build for the template passed successfully. Now I want

to quickly check to make sure it's working properly, as in Postgres

and Redis are working. So I'm going to say, can you send a message to

Slack to basically ask it if all of this is working now?

Okay, so I had to change location, which is why the background is

now a little bit different. But essentially you can see that it then did a

test of Joestar, the brand new sandbox image to make sure that

it has Postgres, Redis, and Playwright. And then inside of the

reply, it basically said for Postgres, it created a brand new

data table, it inserted a row and selected it back. It then tested

Redis to make sure it's working properly. And then it used Playwright. So all

3 things that we require inside the image to make our application

end-to-end testing work. So this is really great because we can do stuff like,

for example, if we add a brand new flow to an application of ours,,

and we can insert seed data into a database to test that particular

flow quite easily. And then after the testing is done, the container will close alongside

Redis and Postgres. And we can resume it later by just

sending up another follow-up message here.
