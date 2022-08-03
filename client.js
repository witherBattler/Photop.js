import fetch from "node-fetch"
import FormData from "form-data"
import SimpleSocket from "simple-socket-js"
const socket = new SimpleSocket({
    project_id: "61b9724ea70f1912d5e0eb11",
    project_token: "client_a05cd40e9f0d2b814249f06fbf97fe0f1d5"
});

socket.remotes.stream = function(data) {
    console.log(data)
}

export async function sendRequest(url, method, body, auth, contentType = "application/json", stringify = true, useJson = false) {
    return new Promise((resolve, reject) => {
        let headers = {
            'Content-Type': contentType
        }
        if(auth) {
            headers["auth"] = auth
        }
        if(stringify) {
            body = JSON.stringify(body)
        }
        if(body) {
            fetch(url, {
                method: method,
                headers,
                body: body
            }).then(response => {
                if(useJson) {
                    response.json().then(data => {
                        resolve(data)
                    })
                } else {
                    response.text().then(data => {
                        resolve(data)
                    })
                }
            })
        } else {
            fetch(url, {
                method: method,
                headers,
            }).then(response => {
                if(useJson) {
                    response.json().then(data => {
                        resolve(data)
                    })
                } else {
                    response.text().then(data => {
                        resolve(data)
                    })
                }
            })
        }
    })
}

function api(url) {
    return "https://photop.exotek.co/" + url
}

export class PhotopSession {
    constructor(config) {
        this.config = config
        this.token = config.token.token
        this.expires = config.token.expires
        // combinee
        this.user = {
            id: config.user._id
        }
    }
    async getSelfData() {
        return sendRequest(
            api("me"),
            "GET",
            undefined,
            this.fullAuth
        )
    }
    async createPost(text, images = [], group = "") {
        let form = new FormData()
        form.append("data", JSON.stringify({ text }))
        for(let i = 0; i != Math.min(images.length, 2); i++) {
            form.append("image-" + i, images[i], "image.jpg")
        }
        const response1 = await fetch(api("posts/new" + (group == "" ? group : "?groupid=" + group)), {
            method: "POST",
            body: form,
            headers: {
                auth: this.fullAuth
            }
        })
        let response = await response1.text()
        return new PhotopSelfPost(response, this, group != "" ? group : undefined)
    }
    async removeProfilePicture() {
        let form = new FormData()

        fetch(
            api("me/new/picture"),
            {
                method: "POST",
                body: form,
                headers: {
                    auth: this.fullAuth
                }
            }
        )
    }
    async removeProfileBanner() {
        let form = new FormData()

        fetch(
            api("me/new/banner"),
            {
                method: "POST",
                body: form,
                headers: {
                    auth: this.fullAuth
                }
            }
        )
    }
    async updateProfilePicture(binary) {
        let form = new FormData()
        form.append("image", binary)
        
        fetch(
            api("me/new/picture"),
            {
                method: "POST",
                body: form,
                headers: {
                    auth: this.fullAuth
                }
            }
        ).then(response => {
            response.text().then(data => {
                console.log(data)
            })
        })
    }
    async updateProfileBanner(binary) {
        let form = new FormData()
        form.append("image", binary)

        await fetch(
            api("me/new/banner"),
            {
                method: "POST",
                body: form,
                headers: {
                    auth: this.fullAuth
                }
            }
        )
    }
    get fullAuth() {
        return this.user.id + ";" + this.token
    }
    updateSetting(setting, value) {
        return sendRequest(
            api("users/update"),
            "POST",
            {
                update: setting,
                value: value
            },
            this.fullAuth
        )
    }
    
}

export class PhotopPost {
    constructor(id, author, groupid, text) {
        this.id = id
		this.authorId = author
		this.text = text || null
        this.group = groupid || null
    }
    async getData() {
        console.log(this.group)
        let response = await sendRequest(
            api("posts?postid=" + this.id + (this.group == null ? "" : "&groupid=" + this.group)),
            "GET",
            undefined,
            currentSession.fullAuth
        )
        response = JSON.parse(response)
        return {
            id: response.posts[0]._id,
            userId: response.posts[0].UserID,
            text: response.posts[0].Text,
            timestamp: response.posts[0].Timestamp,
        }
    }
    async like() {
        let response = await sendRequest(
            api("posts/like?postid=" + this.id),
            "PUT",
            {},
            currentSession.fullAuth
        )
        return true
    }
    async unlike() {
        let response = await sendRequest(
            api("posts/unlike?postid=" + this.id),
            "DELETE",
            {},
            currentSession.fullAuth
        )
        return true
    }
    async getUsersChattingCount() {
        return new Promise((resolve, reject) => {
            let response = sendRequest(
                api("chats/chatting?postid=" + this.id),
                "GET",
                {},
            )
        })
    }
    async sendChat(text, replyTo) {
        let body = {
            text: text
        }
        if(replyTo) {
            body.replyID = replyTo
        }
        let response = await sendRequest(
            api("chats/new?postid=" + this.id),
            "POST",
            body,
            currentSession.fullAuth
        )
        return new PhotopChat(response, this)
    }
    async report(reason, description) {
        let response = await sendRequest(
            api("mod/report?type=post&contentid=" + this.id),
            "PUT",
            {
                reason,
                report: description
            },
            currentSession.fullAuth
        )
    }
    async onChat(callback) {
        let response = await sendRequest(
            api("chats/connect"),
            "POST",
            {
                ssid: socket.secureID,
                connect: [this.id],
            }
        )
        if(chatEventListeners[this.id] == undefined) {
            chatEventListeners[this.id] = [callback]
        } else {
            chatEventListeners[this.id].push(callback)
        }
    }
	async getAuthor() {
		let user = await sendRequest(
			api("user?id=" + this.authorId)
		)
		return new PhotopUser(JSON.parse(user))
	}
}

export class PhotopChat {
    constructor(id, post) {
        this.id = id
        this.post = post
    }
    async reply(text) {
        let response = await sendRequest(
            api("chats/new?postid=" + this.post),
            "POST",
            {
                text: text,
                replyID: this.id
            },
            currentSession.fullAuth
        )
        return new PhotopChat(response, this.post)
    }
    async delete() {
        let response = await sendRequest(
            api("chats/delete?chatid=" + this.id),
            "DELETE",
            {},
            currentSession.fullAuth
        )
    }
    async report(reason, description) {
        let response = await sendRequest(
            api("mod/report?type=chat&contentid=" + this.id),
            "PUT",
            {
                reason,
                report: description
            },
            currentSession.fullAuth
        )
    }
}

export class PhotopSelfPost extends PhotopPost {
    constructor(id, session) {
        super(id)
        this.url = "https://app.photop.live/?post=" + id
        this.session = session
    }
    async delete() {
        let response = await sendRequest(
            api("posts/delete?postid=" + this.id),
            "POST",
            {},
            this.session.fullAuth
        )
        return response
    }
    async pin() {
        let response = await sendRequest(
            api("posts/pin?postid=" + this.id),
            "PUT",
            {},
            this.session.fullAuth
        )
    }
    async unpin() {
        let additionalGroupString = ""
        if(this.group != undefined) {
            additionalGroupString = "?groupid=" + this.group
        }
        let response = await sendRequest(
            api("posts/unpin?postid=" + this.id + additionalGroupString),
            "DELETE",
            {},
            this.session.fullAuth
        )
        return response
    }
}

let newPostListeners = []
let currentSession

export function signIn(username, password) {
	return new Promise(async function(resolve, reject) {
		let response = await sendRequest(
			api("temp/signin"),
			"POST",
			{
				username: username,
				password: password
			}
		);
		let session = new PhotopSession(JSON.parse(response))
		currentSession = session
		resolve(session)
	}) 
}
export function onPost(callback) {
    initializeMainPostListener()
    newPostListeners.push(callback)
}
export async function getUserById(id) {
	let response = await sendRequest(
		api("user?id=" + id),
		"GET",
	)
	return new PhotopUser(JSON.parse(response))
}
export async function getUserByUsername(username) {
	let response = await sendRequest(
		api("user?name=" + username),
		"GET",
	)
	return new PhotopUser(JSON.parse(response))
}
export async function getPostById(id, groupid) {
	let response = await sendRequest(
		api("posts?postid=" + id + (groupid) == undefined ? "" : "&groupid=" + groupid),
		"GET",
	)
	return new PhotopPost(response.post._id, response.post.UserId, groupid)
}

class PhotopUser {
    constructor(config) {
        this.config = config
    }
    get id() {
        return this.config._id
    }
    get username() {
        return this.config.User
    }
    get roles() {
        return this.config.Role
    }
    get profilePictureStorageID() {
        return this.config.Settings.ProfilePic
    }
    async getProfilePictureBinary() {
        let a = await fetch("https://photop-content.s3.amazonaws.com/ProfileImages/" + this.profilePictureStorageID)
        let b = await a.arrayBuffer()
        return Buffer.from(b, "utf-8")
    }
    get followers() {
        return this.config.ProfileData.Followers
    }
    get following() {
        return this.config.ProfileData.Following
    }
    get socials() {
        return this.config.ProfileData.Socials
    }
    get parsedSocials() {
        let result = []
        let socials = Object.keys(this.socials)
        for(let social of socials) {
            let parts = social.split("_")
            result.push({
                type: parts[0],
                id: parts[1],
                username: this.socials[social]
            })
        }
        return result
    }
}

let mainPostListenerInitialized = false
function initializeMainPostListener() {
    if(!mainPostListenerInitialized) {
        socket.subscribe({
            task: "general",
            location: "home",
            userId: "",
            groups: [],
            token: "client_a05cd40e"
        }, function(data) {
            switch(data.type) {
                case "newpost":
                    for(let i = 0; i != newPostListeners.length; i++) {
                        newPostListeners[i](new PhotopPost(data.post._id, data.post.UserID, undefined))
                    }
                    break
            }
        })
        mainPostListenerInitialized = true
    }
}
function initializeGroupPostListener(groupId) {
    socket.subscribe({
        task: "general",
        location: "home",
        userId: "",
        groups: [groupId],
        token: "client_a05cd40e"
    }, function(data) {
        switch(data.type) {
            case "newpost":
                if(groupPostListeners[groupId] != undefined) {
                    for(let i = 0; i != groupPostListeners[groupId].length; i++) {
                        groupPostListeners[groupId][i](new PhotopPost(data.post._id, data.post.UserID, groupId))
                    }
                }
        }
    })
}
let groupPostListeners = {}
export function onGroupPost(groupId, callback) {
    if(groupPostListeners[groupId] == undefined) {
        groupPostListeners[groupId] = [callback]
        initializeGroupPostListener(groupId)
    } else {
        groupPostListeners[groupId].push(callback)
    }
}
let chatEventListeners = {

}
socket.remotes.stream = function(data) {
  if(chatEventListeners[data.chat.PostID] != undefined) {
    for(let i = 0; i != chatEventListeners[data.chat.PostID].length; i++) {
	    let chat = new PhotopChat(data.chat._id, data.chat.PostID)
	    chat.authorId = data.chat.UserID
	    chat.timestamp = data.chat.Timestamp
	    chat.id = data.chat._id
	    chat.text = data.chat.Text
		chat.getAuthor = async function() {
			let user = await sendRequest(
				api("user?id=" + data.chat.UserID)
			)
			return new PhotopUser(JSON.parse(user))
		}
		
        chatEventListeners[data.chat.PostID][i](chat)
    }
  }
}