# Photop.js
## ***Thanks a lot to stalicites (qa#1337) for writing the documentation...***
<br>
Photop.js is a library created by IMPixel, and used to accomplish creating bots on [Photop](https://photop.live)
<br>
The library is written in Javascript and only supports Javascript currently.
<br>

This documentation requires knowledge of async functions. If you don't know what those are, read up on them [here](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/async_function)

## Initializing a bot instance
Initializing a bot instance requires account credentials, i.e a username and password
```
const session = await signIn(process.env["username"], process.env["password"])
```
Note that a sign in only supports a username and password. An account token is not allowed.

The ```signIn``` function returns a user session, which can then be used to peform certain actions on Photop as the bot.

## Creating a post

After initializing your bot instance, you can perform actions on Photop as the bot.
<br>
Creating a post is as simple as:
```
session.createPost(postText, attachedImages)
// postText is the text content of the post
// attachedImages is an array of readable streams, each representing an attachment.
```

## Listening to new posts
To listen to posts, you need to import ```appendEventListener``` from the library.
```
import { appendEventListener } from "photop.js"
```
After you've imported ```appendEventListener```:
```
appendEventListener("newPost", (post) => {
    console.log("A new post!")
    // You can access the new post via the post object passed through the function.
    // The post object is an instance from the post class.  
})
```
To get the post data:
```
appendEventListener("newPost", async (post) => {
    console.log("A new post!")
    let postData = await post.getData();
    /*
    postData returns:
    {
        id: The ID of the post,
        userId: The user ID of the author of the post,
        text: The text content of the post,
        timestamp: The creation date of the post,
    }
    */
})
```

## Modifying posts

To like post, run ```post.like()```, and to unlike a post, run ```post.unlike()``` on a post instance.
<br>
To send a chat:
```
await post.sendChat(textContent, replyID)
```
The first parameter (textContent) is required, and represents the content of the chat.
<br>
The second parameter (replyID) is optional, but if provided, should represent an ID of the chat being replied to.

<br>
To report a post:

```
await post.report(reason, desc)
```
A reason is required, but a description is optional.
<br> 
The reason must be any of:
```
Inappropriate Content
Inappropriate Username
Threats or Endangerment
Hate Speech, Harassment, or Abuse
Evading Bans, Mutes, or Blocks
Spamming
Spreading Rumors or False Information
Posting Malicious Content or Links
May be Inflicting Physical Harm
Other
```



Listening to a post for chats:
```
// This code has the bot reply "purr" to every chat whenever someone says "meow" in a post. 
// Please don't actually make a bot like this
appendEventListener("newPost", (post) => {
    let postData = await post.getData();  
    if (postData.text == "meow") {
        // connect to the post
        post.onChat((chat) => {
            post.sendChat("purr", chat.id); // replies to every chat with purr
        });
     }
})
```
