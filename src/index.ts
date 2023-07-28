import { Context, Schema, Random, h } from 'koishi'
import { } from 'koishi-plugin-adapter-iirose'

export const name = 'iirose-welcome'

export interface Config {
  fit: boolean
  private: boolean
  welcomeList: string[]
  exitList: string[]
}

export const Config: Schema<Config> = Schema.intersect([
  Schema.object({
    fit: Schema.boolean().description('是否适配进/退群').default(false),
    private: Schema.boolean().description('是否更改为进群欢迎私聊').default(false)
  }).description('基础配置'),
  Schema.object({
    welcomeList: Schema.array(String).description('欢迎语序列').default(['欢迎(@)的到来！']),
    exitList: Schema.array(String).description('退出语序列').default(['唔唔！灰灰！(@)'])
  }).description('欢迎词配置')
])

const getWelcome = (config: Config, username: string) => {
  const index = Random.real(0, config.welcomeList.length - 1)
  const welcomeMsg = config.welcomeList[index]
  const msg = welcomeMsg.replace('(@)', `<at id="${username}"/>`)
  return msg
}

const getExit = (config: Config, username: string) => {
  const index = Random.real(0, config.exitList.length - 1)
  const exitMsg = config.exitList[index]
  const msg = exitMsg.replace('(@)', `<at id="${username}"/>`)
  return msg
}

export function apply(ctx: Context, config: Config) {
  ctx.on('iirose/joinRoom', (session, data) => {
    if (!config.private) {
      session.send({
        public: {
          message: getWelcome(config, data.username)
        }
      })
    } else {
      session.send({
        private: {
          message: getWelcome(config, data.username),
          userId: session.author.userId
        }
      })
    }
  })

  ctx.on('iirose/leaveRoom', (session, data) => {
    if (!config.private) {
      session.send({
        public: {
          message: getExit(config, data.username)
        }
      })
    } else {
      session.send({
        private: {
          message: getExit(config, data.username),
          userId: session.author.userId
        }
      })
    }

  })

  if (config.fit) {
    ctx.on('guild-added', session => {
      if (!config.private) {
        session.send(getWelcome(config, session.username))
      } else {
        session.bot.sendPrivateMessage(session.channelId, getWelcome(config, session.username))
      }
    })

    ctx.on('guild-deleted', session => {
      if (!config.private) {
        session.send(getExit(config, session.username))
      } else {
        session.bot.sendPrivateMessage(session.channelId, getExit(config, session.username))
      }
    })
  }
}