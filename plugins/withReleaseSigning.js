// Assina o APK de release com a chave própria do Leve. A chave e as senhas ficam fora do projeto,
// no gradle.properties do usuário (LEVE_RELEASE_*); ver docs/03-arquitetura.md § 10.
// Sem a chave, o build de release falha de propósito: um APK assinado com outra chave não instala
// por cima do app dela, e desinstalar para instalar apagaria os dados.

const { withAppBuildGradle } = require('expo/config-plugins');

const MARK = 'LEVE_RELEASE_STORE_FILE';

const RELEASE_SIGNING = `
        release {
            // Chave própria do Leve (docs/03-arquitetura.md § 10), lida do gradle.properties do usuário.
            if (project.hasProperty('LEVE_RELEASE_STORE_FILE')) {
                storeFile file(LEVE_RELEASE_STORE_FILE)
                storePassword LEVE_RELEASE_STORE_PASSWORD
                keyAlias LEVE_RELEASE_KEY_ALIAS
                keyPassword LEVE_RELEASE_KEY_PASSWORD
            }
        }`;

const GUARD = `
// Leve: sem a chave própria, o APK de release não é gerado (ver plugins/withReleaseSigning.js).
tasks.matching { it.name == 'preReleaseBuild' }.configureEach {
    doFirst {
        if (!project.hasProperty('LEVE_RELEASE_STORE_FILE')) {
            throw new GradleException('Chave de assinatura do Leve não configurada (LEVE_RELEASE_* no gradle.properties do usuário). Veja docs/03-arquitetura.md § 10.')
        }
    }
}
`;

/** Acha o fechamento da chave aberta em `open` (índice do "{"). */
function closingBrace(src, open) {
  let depth = 0;
  for (let i = open; i < src.length; i++) {
    if (src[i] === '{') depth++;
    else if (src[i] === '}' && --depth === 0) return i;
  }
  return -1;
}

/** Índice do "{" de um bloco `name {` a partir de `from`, ou -1. */
function blockOpen(src, name, from = 0) {
  const re = new RegExp(`\\b${name}\\s*\\{`, 'g');
  re.lastIndex = from;
  const m = re.exec(src);
  return m ? m.index + m[0].length - 1 : -1;
}

function addReleaseSigning(src) {
  if (src.includes(MARK)) return src;
  const fail = (what) => {
    throw new Error(`withReleaseSigning: não achei ${what} no android/app/build.gradle; o modelo da Expo mudou?`);
  };

  // 1. signingConfigs { debug {...} } ganha o bloco release.
  const configs = blockOpen(src, 'signingConfigs');
  if (configs < 0) fail('signingConfigs');
  const configsEnd = closingBrace(src, configs);
  src = `${src.slice(0, configsEnd).trimEnd()}${RELEASE_SIGNING}\n    ${src.slice(configsEnd)}`;

  // 2. buildTypes { release { signingConfig signingConfigs.debug } } passa a usar a chave própria.
  const types = blockOpen(src, 'buildTypes');
  if (types < 0) fail('buildTypes');
  const release = blockOpen(src, 'release', types);
  if (release < 0 || release > closingBrace(src, types)) fail('buildTypes.release');
  const releaseEnd = closingBrace(src, release);
  const body = src.slice(release, releaseEnd);
  if (!body.includes('signingConfig signingConfigs.debug')) fail('a assinatura do buildTypes.release');
  src = src.slice(0, release) + body.replace('signingConfig signingConfigs.debug', 'signingConfig signingConfigs.release') + src.slice(releaseEnd);

  return src + GUARD;
}

module.exports = function withReleaseSigning(config) {
  return withAppBuildGradle(config, (cfg) => {
    if (cfg.modResults.language !== 'groovy') throw new Error('withReleaseSigning: build.gradle não é Groovy.');
    cfg.modResults.contents = addReleaseSigning(cfg.modResults.contents);
    return cfg;
  });
};
