import {Message, TextChannel} from 'discord.js'
import VrcApi from 'vrchat-client/dist/vrc-api'
import {UserResponse} from 'vrchat-client/dist/types/user'
import {datastore} from 'nedb-promise'


export async function registerUser(message: Message, api: VrcApi) {
  const channel = message.channel
  const command = message.content.split(" ")
  if (message.author.bot || channel.id !== process.env.SETTING_CHANNEL_ID || command.shift() !== "/register") {
    return
  }
  const mentionUsers = message.mentions.users
  if (command.length == 1 && mentionUsers.size != 0 || command.length == 2 && mentionUsers.size != 1) {
    channel.send('コマンド間違っとるで')
  }

  let discordId = message.author.id
  if (message.mentions.users.size > 0) {
    discordId = message.mentions.users.first().id
    command.shift()
  }

  const vrc = command.shift()
  let user: UserResponse = null
  try {
    user = await api.user.getById(vrc)
  } catch (e) {
    try {
      user = await api.user.getByName(vrc)
    } catch (e) {
      channel.send('名前でもIDでもないっぽいぞ')
    }
  }

  const db = datastore({
    filename: '/db/users.db',
    autoload: true,
  })
  const checkId = await db.count({discordId: discordId})
  if (checkId > 0) {
    channel.send("なんかもう登録されてるで｡消すときは`/remove [mention]`してな｡")
    return
  }
  db.insert({vrchatId: user.id, discordId: discordId})
  let data = await db.find({})
  data = data.filter(v => v.chatId)
  db.update({}, {$unset: {chatId: true}}, {multi: true})
  data.forEach(async v => {
    const mes = await (<TextChannel>message.guild.channels.get(process.env.CHANNEL_ID)).fetchMessage(v.chatId)
    mes.delete()
  })
  channel.send(`<@${discordId}> VRChat: ${user.username} (${user.id})を登録したぞ`)
}