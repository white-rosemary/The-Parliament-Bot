const config = require('../config');

class AvatarCollector {
  constructor() {
    this.users = new Map();
  }

  collect(user) {
    if (!user || !user.id || this.users.has(user.id)) return;

    const fileName = `${user.id}.png`;
    const avatarUrl = user.displayAvatarURL({
      extension: 'png',
      size: config.avatarSize,
      forceStatic: true,
    });

    this.users.set(user.id, {
      id: user.id,
      username: user.username,
      globalName: user.globalName ?? null,
      discriminator: user.discriminator,
      bot: user.bot,
      avatarHash: user.avatar ?? null,
      avatarUrl,
      file: `avatars/${fileName}`,
    });
  }

  get size() {
    return this.users.size;
  }

  entries() {
    return [...this.users.values()];
  }
}

async function appendAvatarsToArchive(archive, avatarCollector, errors = []) {
  const users = avatarCollector.entries();
  const manifest = [];

  for (const user of users) {
    try {
      const response = await fetch(user.avatarUrl);
      if (!response.ok) {
        errors.push(`头像下载失败 [${user.id}]: HTTP ${response.status}`);
        continue;
      }

      const contentType = response.headers.get('content-type') || '';
      const buffer = Buffer.from(await response.arrayBuffer());
      archive.append(buffer, { name: user.file });

      manifest.push({
        id: user.id,
        username: user.username,
        globalName: user.globalName,
        discriminator: user.discriminator,
        bot: user.bot,
        avatarHash: user.avatarHash,
        avatarUrl: user.avatarUrl,
        contentType,
        size: buffer.length,
        file: user.file,
      });
    } catch (err) {
      errors.push(`头像下载失败 [${user.id}]: ${err.message}`);
    }
  }

  archive.append(
    JSON.stringify({
      imageSize: config.avatarSize,
      count: manifest.length,
      users: manifest,
    }, null, 2),
    { name: 'avatars_manifest.json' },
  );

  return manifest.length;
}

module.exports = { AvatarCollector, appendAvatarsToArchive };
