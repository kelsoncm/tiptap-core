/** A character offered by the emoji picker or the character map. */
export interface SymbolItem {
  char: string;
  /** Search words (pt-BR and en), space separated. */
  keywords: string;
}

export interface SymbolGroup {
  id: string;
  /** i18n key of the group name. */
  labelKey: string;
  items: readonly SymbolItem[];
}

const group = (id: string, entries: string): SymbolGroup => ({
  id,
  labelKey: `editor.symbols.${id}`,
  items: entries
    .trim()
    .split('\n')
    .map((line) => {
      const [char = '', ...words] = line.trim().split(/\s+/);
      return { char, keywords: words.join(' ') };
    }),
});

/**
 * Curated emoji set (no emoji database dependency). Each line: emoji followed by keywords.
 */
export const EMOJI_GROUPS: readonly SymbolGroup[] = [
  group(
    'smileys',
    `
😀 sorriso feliz grin smile happy
😃 sorriso alegre smiley
😄 risada alegre laugh
😁 sorriso dentes beaming
😅 suor alivio sweat
😂 lagrimas rindo joy tears
🙂 leve sorriso slight smile
😉 piscar wink
😊 corado feliz blush
😍 apaixonado amor heart eyes love
🤩 estrela encantado star struck
😘 beijo kiss
😎 oculos legal cool sunglasses
🤔 pensando thinking
😐 neutro neutral
🙄 revirar olhos eye roll
😴 dormindo sleep
😢 triste choro sad cry
😭 chorando muito sob
😡 bravo raiva angry
😱 susto medo scream
🤯 cabeca explodindo mind blown
🥳 festa comemoracao party
🤗 abraco hug
🙏 obrigado por favor reza pray thanks
`,
  ),
  group(
    'gestures',
    `
👍 joinha positivo like thumbs up
👎 negativo dislike thumbs down
👏 palmas aplausos clap
🙌 celebrar maos raised hands
👋 ola tchau wave hello
✌️ paz vitoria peace victory
🤝 aperto de mao acordo handshake
💪 forca musculo strong
👀 olhos olhar eyes look
☝️ atencao indicador point up
👉 apontar direita point right
✋ pare mao stop hand
`,
  ),
  group(
    'symbols',
    `
❤️ coracao amor heart love
💡 ideia lampada idea bulb
⭐ estrela star
🔥 fogo destaque fire hot
✅ feito concluido check done
❌ erro errado cross wrong
⚠️ aviso atencao warning
❗ importante exclamacao exclamation
❓ duvida pergunta question
📌 fixado alfinete pin
📎 clipe anexo paperclip attach
🔒 cadeado seguro lock
🔔 sino aviso bell notification
💯 cem perfeito hundred
🆕 novo new
♻️ reciclar recycle
`,
  ),
  group(
    'objects',
    `
📄 documento page document
📝 anotacao memo note
📚 livros estudo books study
🎓 formatura graduacao graduation
📅 calendario data calendar date
⏰ alarme prazo alarm deadline
📊 grafico barras chart bar
📈 crescimento grafico chart up
📉 queda grafico chart down
💻 computador laptop computer
📱 celular phone mobile
✉️ email carta envelope mail
📞 telefone phone
🔍 busca lupa search
⚙️ configuracao engrenagem settings gear
🏫 escola school
🏆 trofeu premio trophy
🎉 festa confete party tada
🚀 foguete lancamento rocket launch
💰 dinheiro money
`,
  ),
  group(
    'nature',
    `
☀️ sol sun
🌧️ chuva rain
🌈 arco iris rainbow
🌱 planta broto seedling
🌳 arvore tree
🌎 mundo terra globe earth
🐶 cachorro dog
🐱 gato cat
🍎 maca fruta apple
☕ cafe coffee
`,
  ),
];

/** Character map: accented letters, punctuation, math, arrows, currency, Greek. */
export const CHARACTER_GROUPS: readonly SymbolGroup[] = [
  group(
    'latin',
    `
á a agudo
à a crase
â a circunflexo
ã a til
ç c cedilha
é e agudo
ê e circunflexo
í i agudo
ó o agudo
ô o circunflexo
õ o til
ú u agudo
ü u trema
ñ n til eñe
Á A agudo maiusculo
À A crase maiusculo
Â A circunflexo maiusculo
Ã A til maiusculo
Ç C cedilha maiusculo
É E agudo maiusculo
Ê E circunflexo maiusculo
Í I agudo maiusculo
Ó O agudo maiusculo
Ô O circunflexo maiusculo
Õ O til maiusculo
Ú U agudo maiusculo
ß eszett
æ ae
ø o barrado
`,
  ),
  group(
    'punctuation',
    `
— travessao em dash
– meia risca en dash
… reticencias ellipsis
« aspas angulares abrir guillemet
» aspas angulares fechar guillemet
“ aspas abrir left quote
” aspas fechar right quote
‘ aspa simples abrir
’ apostrofo aspa simples fechar
• marcador bullet
· ponto medio middle dot
§ paragrafo secao section
¶ pilcrow paragrafo
† adaga dagger
‡ adaga dupla double dagger
© copyright direitos autorais
® registrado registered
™ marca trademark
º ordinal masculino
ª ordinal feminino
° grau degree
¿ interrogacao invertida
¡ exclamacao invertida
`,
  ),
  group(
    'math',
    `
± mais ou menos plus minus
× vezes multiplicacao times
÷ divisao divide
≠ diferente not equal
≈ aproximadamente approx
≤ menor ou igual less equal
≥ maior ou igual greater equal
∞ infinito infinity
√ raiz quadrada sqrt
∑ somatorio sum
∏ produtorio product
∫ integral
∂ derivada parcial partial
∆ delta incremento
∈ pertence element
∉ nao pertence not element
⊂ subconjunto subset
∪ uniao union
∩ intersecao intersection
∀ para todo for all
∃ existe exists
¬ negacao not
∧ e logico and
∨ ou logico or
½ meio half
¼ um quarto quarter
¾ tres quartos
² ao quadrado squared
³ ao cubo cubed
‰ por mil per mille
`,
  ),
  group(
    'arrows',
    `
← seta esquerda left arrow
→ seta direita right arrow
↑ seta cima up arrow
↓ seta baixo down arrow
↔ seta dupla horizontal
↕ seta dupla vertical
⇐ implica esquerda
⇒ implica direita implies
⇔ equivalente iff
↩ retorno return
⟶ seta longa long arrow
`,
  ),
  group(
    'currency',
    `
R$ real brl
$ dolar dollar
€ euro
£ libra pound
¥ iene yen
₿ bitcoin
¢ centavo cent
`,
  ),
  group(
    'greek',
    `
α alfa alpha
β beta
γ gama gamma
δ delta
ε epsilon
θ teta theta
λ lambda
μ mi mu
π pi
ρ ro rho
σ sigma
τ tau
φ fi phi
ω omega
Ω omega maiusculo ohm
Σ sigma maiusculo
Π pi maiusculo
`,
  ),
];
