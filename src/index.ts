import { Context, Schema, Random, h } from 'koishi';
import { } from 'koishi-plugin-adapter-iirose';

export const name = 'iirose-welcome';

export interface Config {
  fit: boolean;
  private: boolean;
  welcomeList: string[];
  exitList: string[];
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
]);

const getWelcome = (config: Config, username: string) => {
  const random = new Random(() => Math.random())
  const index = random.int(0, config.welcomeList.length);
  
  const welcomeMsg = config.welcomeList[index];

  const msg = (/@/.test(welcomeMsg)) ? welcomeMsg.replace('(@)', `<at name="${username}"/>`) : welcomeMsg;
  return msg;
};

const getExit = (config: Config, username: string) => {
  const random = new Random(() => Math.random())
  const index = random.int(0, config.exitList.length);

  const exitMsg = config.exitList[index];
  
  const msg = (/@/.test(exitMsg)) ? exitMsg.replace('(@)', `<at name="${username}"/>`) : exitMsg;
  return msg;
};

export function apply(ctx: Context, config: Config) {
  ctx.on('iirose/joinRoom', (session) => {
    if (config.welcomeList.length <= 0) { return }
    
    if (!config.private) {
      session.bot.sendMessage('public:',getWelcome(config, session.username))
    } else {
      session.bot.sendMessage(`private:${session.userId}`, getWelcome(config, session.username));
    }
  });

  ctx.on('iirose/leaveRoom', (session) => {
    if (config.exitList.length <= 0) { return }
    
    if (!config.private) {
      session.bot.sendMessage('public:',getExit(config, session.username))
    } else {
      session.bot.sendMessage(`private:${session.userId}`, getExit(config, session.username));
    }

  });

  if (config.fit) {
    ctx.on('guild-member-added', session => {
      if (config.welcomeList.length <= 0) { return }

      if (!config.private) {
        session.send(getWelcome(config, session.username));
      } else {
        session.bot.sendPrivateMessage(session.channelId, getWelcome(config, session.username));
      }
    });

    ctx.on('guild-member-removed', session => {
      if (config.exitList.length <= 0) { return }
    
      if (!config.private) {
        session.send(getExit(config, session.username));
      } else {
        session.bot.sendPrivateMessage(session.channelId, getExit(config, session.username));
      }
    });
  }
}
