import { Context, Schema, Random, h, Session } from 'koishi';
import { } from 'koishi-plugin-adapter-iirose';

export const name = 'iirose-welcome';
export const inject = ['database']
export interface Config
{
  fit: boolean;
  private: boolean;
  welcomeList: string[];
  exitList: string[];
}

declare module 'koishi' {
  interface Tables
  {
    iirose_welcome: iirose_welcome;
  }
}

export interface iirose_welcome
{
  uid: string;
  welcomeMsg: string;
  leaveMsg: string;
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

export function apply(ctx: Context, config: Config)
{
  const getWelcome = async (config: Config, username: string, uid:string) =>
  {
    const getMsgTemp = await ctx.database.get('iirose_welcome', { uid: uid });

    const getMsg = getMsgTemp.length > 0 ? getMsgTemp[0].welcomeMsg : null;

    if (getMsg && getMsg != '')
    {
      const msg = (/@/.test(getMsg)) ? getMsg.replace('(@)', `<at name="${username}"/>`) : getMsg;

      return msg;
    }

    const random = new Random(() => Math.random());
    const index = random.int(0, config.welcomeList.length);

    const welcomeMsg = config.welcomeList[index];

    const msg = (/@/.test(welcomeMsg)) ? welcomeMsg.replace('(@)', `<at name="${username}"/>`) : welcomeMsg;

    return msg;
  };

  const getExit = async (config: Config, username: string, uid: string) =>
  {
    const getMsgTemp = await ctx.database.get('iirose_welcome', { uid: uid });

    const getMsg = getMsgTemp.length > 0 ? getMsgTemp[0].leaveMsg : null;

    if (getMsg && getMsg != '')
    {
      const msg = (/@/.test(getMsg)) ? getMsg.replace('(@)', `<at name="${username}"/>`) : getMsg;

      return msg;
    }

    const random = new Random(() => Math.random());
    const index = random.int(0, config.exitList.length);

    const exitMsg = config.exitList[index];

    const msg = (/@/.test(exitMsg)) ? exitMsg.replace('(@)', `<at name="${username}"/>`) : exitMsg;
    return msg;
  };

  ctx.model.extend('iirose_welcome', {
    uid: 'string',
    welcomeMsg: 'string',
    leaveMsg: 'string'
  }, {
    primary: 'uid'
  });

  ctx.on('iirose/joinRoom', async (session, data) =>
  {
    if (config.welcomeList.length <= 0) { return; }
    if (session.userId == session.bot.user.id || session.userId == session.bot.selfId) { return; }

    if (!config.private)
    {
      session.bot.sendMessage('public:', await getWelcome(config, data.username, data.uid));
    } else
    {
      session.bot.sendMessage(`private:${session.userId}`, await getWelcome(config, data.username, data.uid));
    }
  });

  ctx.on('iirose/leaveRoom', async (session, data) =>
  {
    if (config.exitList.length <= 0) { return; }
    if (session.userId == session.bot.user.id || session.userId == session.bot.selfId) { return; }

    if (!config.private)
    {
      session.bot.sendMessage('public:', await getExit(config, data.username, data.uid));
    } else
    {
      session.bot.sendMessage(`private:${session.userId}`, await getExit(config, data.username, data.uid));
    }

  });

  if (config.fit)
  {
    ctx.on('guild-member-added', async session =>
    {
      if (config.welcomeList.length <= 0) { return; }
      if (session.userId == session.bot.user.id || session.userId == session.bot.selfId) { return; }

      if (!config.private)
      {
        session.send(await getWelcome(config, session.username, session.userId));
      } else
      {
        session.bot.sendPrivateMessage(session.channelId, await getWelcome(config, session.username, session.userId));
      }
    });

    ctx.on('guild-member-removed', async session =>
    {
      if (config.exitList.length <= 0) { return; }
      if (session.userId == session.bot.user.id || session.userId == session.bot.selfId) { return; }

      if (!config.private)
      {
        session.send(await getExit(config, session.username, session.userId));
      } else
      {
        session.bot.sendPrivateMessage(session.channelId, await getExit(config, session.username, session.userId));
      }
    });
  }

  ctx.command('iirose', '花园工具');

  ctx.command("iirose.wb.set <message>", '设置自己的专属欢迎词').action(async (v, message) =>
  {
    if (v.session.platform != 'iirose') { return; }
    if (!message) { return `<at name="${v.session.username}"/>你没有设置欢迎词`; }

    await ctx.database.upsert('iirose_welcome', [{
      uid: v.session.userId,
      welcomeMsg: message
    }]);

    return `<at name="${v.session.username}"/>设置成功`;
  });

  ctx.command("iirose.wb.rm", '清除自己设置的专属欢迎词').action(async v =>
  {
    if (v.session.platform != 'iirose') { return; }
    const userDataTemp = await ctx.database.get('iirose_welcome', v.session.userId);
    if (userDataTemp.length <= 0) { return `<at name="${v.session.username}"/>你没有设置自己的欢迎词`; }

    await ctx.database.upsert('iirose_welcome', [{
      uid: v.session.userId,
      welcomeMsg: ''
    }]);

    return `<at name="${v.session.username}"/>删除成功`;
  });

  ctx.command("iirose.lr.set <message>", '设置自己的专属送别词').action(async (v, message) =>
  {
    if (v.session.platform != 'iirose') { return; }
    if (!message) { return `<at name="${v.session.username}"/>你没有设置欢迎词`; }

    await ctx.database.upsert('iirose_welcome', [{
      uid: v.session.userId,
      leaveMsg: message
    }]);

    return `<at name="${v.session.username}"/>设置成功`;
  });

  ctx.command("iirose.lr.rm", '清除自己设置的专属送别词').action(async v =>
  {
    if (v.session.platform != 'iirose') { return; }
    const userDataTemp = await ctx.database.get('iirose_welcome', v.session.userId);
    if (userDataTemp.length <= 0) { return `<at name="${v.session.username}"/>你没有设置自己的欢迎词`; }

    await ctx.database.upsert('iirose_welcome', [{
      uid: v.session.userId,
      leaveMsg: ''
    }]);

    return `<at name="${v.session.username}"/>删除成功`;
  });

}
