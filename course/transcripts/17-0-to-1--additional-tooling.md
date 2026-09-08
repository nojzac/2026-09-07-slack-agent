# Additional Tooling

- class: slack-agents
- chapter: 0 to 1
- title: Additional Tooling
- url: https://www.agenticcoding.school/v/ejxRCE8L
- durationSeconds: 144
- fetched: 2026-09-05
- transcriptChars: 2699

## Description (video page text, NOT transcript; may contain links)

(none)

## Transcript

Okay, so I'm going to quickly show you how you can add additional functionality to your Slack bot agent. And this can be really handy for situations whereby you may realize you want your agent to be able to respond by voice, or you want it to take voice as input. You could just add a skill that would allow it to use ElevenLabs for transcription. Basically any functionality that you notice is missing for your agent, you can just quickly tell it to make a skill and then add the relevant environment variables there too. So I'm going to quickly do the ability to transcribe audio. So I can basically send an audio message over Slack, which you can already do by pressing the record audio clip button over here. So of course you can do something like installing Whisper onto the sandbox directly, but that can be pretty slow. And it's not as accurate compared to ElevenLabs Scribe V2, for example. So I'm going to quickly say, hey, can you add ElevenLabs Scribe V2 so that the agent is able to take in voice messages, add it as a skill, and let me know where I should set the environment variable. API keys. And then I will test it out manually once you're done. So it'll literally just be a case of describing the functionality that you want added. And in this case, it won't be able to do end-to-end verification, because I don't think it will be able to send an audio clip on our behalf pretending to be us. So we will have to do our own verification once it is done. And now I added both the ElevenLabs skill and also the relevant stuff. Now it was not able to do an end-to-end test for the voice message because of course it can't send a voice message. So I'll have to quickly do that myself by recording an audio clip over here and then just being like, hey, this is a quick test. Can you just reply to this with a short story about one paragraph long? And now if I tag Joestar and then send this as well, it should recognize like, hey, this is an audio recording. I should download it, transcribe it, and then actually look at what it says and then act on it. And you can see it quickly transcribed what I said up here and then gave me a short story as a reply. So this is basically how we add additional functionality to our Slack bot. We just describe to Claude what we want, and it will usually make it in the form of a skill. And if it needs to, it may add some kind of proxy to make sure it works. You would want to say, hey, can you give me a few suggestions for how this can be added? And then choose the one that it recommends for you. Now, as of the time of recording, this is pretty much everything for the class, but I may add more videos to this class in the future as things change, or if others have different suggestions of things that they would like to see.
