const SPECIES = [
  {
    id: 'budgie',
    name: 'Волнистый попугай',
    shortName: 'волнистом попугае',
    description:
      'Компактный, общительный и яркий спутник. Отлично подходит новичкам и семьям.',
    features: ['Размер: маленький', 'Характер: любопытный', 'Голос: щебет и трели', 'Социальность: высокая'],
    size: 'маленький',
    lifespan: '7–15 лет',
    noiseLevel: 'средний',
    image: 'images/parrots/budgie.jpg',
    imageAlt: 'Волнистые попугаи',
    imagePosition: '50% 18%',
  },
  {
    id: 'cockatiel',
    name: 'Корелла',
    shortName: 'корелле',
    description:
      'Нежная птица с выразительным хохолком. Любит внимание и спокойное общение.',
    features: ['Размер: средний', 'Характер: ласковый', 'Голос: свист', 'Социальность: высокая'],
    size: 'средний',
    lifespan: '15–25 лет',
    noiseLevel: 'средний',
    image: 'images/parrots/cockatiel.jpg',
    imageAlt: 'Корелла с хохолком',
    imagePosition: 'center center',
    imageFit: 'contain',
  },
  {
    id: 'lovebird',
    name: 'Неразлучник',
    shortName: 'неразлучнике',
    description:
      'Энергичный и яркий попугай. Привязывается к человеку или паре и любит активность.',
    features: ['Размер: маленький', 'Характер: темпераментный', 'Голос: звонкий', 'Социальность: высокая'],
    size: 'маленький',
    lifespan: '10–15 лет',
    noiseLevel: 'высокий',
    image: 'images/parrots/lovebird.jpg',
    imageAlt: 'Неразлучник',
    imagePosition: '40% 28%',
  },
  {
    id: 'ringneck',
    name: 'Ожереловый попугай',
    shortName: 'ожереловом попугае',
    description:
      'Умный и разговорчивый вид. Нуждается в пространстве, занятиях и терпеливом приручении.',
    features: ['Размер: средний', 'Характер: независимый', 'Голос: громкий', 'Социальность: средняя'],
    size: 'средний',
    lifespan: '20–30 лет',
    noiseLevel: 'высокий',
    image: 'images/parrots/ringneck.jpg',
    imageAlt: 'Ожереловый попугай',
    imagePosition: '72% 40%',
  },
  {
    id: 'african-grey',
    name: 'Жако',
    shortName: 'жако',
    description:
      'Один из самых интеллектуальных попугаев. Требует опытного владельца и богатой среды.',
    features: ['Размер: средний', 'Характер: чувствительный', 'Голос: очень способный к речи', 'Социальность: высокая'],
    size: 'средний',
    lifespan: '40–60 лет',
    noiseLevel: 'средний',
    image: 'images/parrots/african-grey.jpg',
    imageAlt: 'Жако — африканский серый попугай',
    imagePosition: '42% 18%',
  },
  {
    id: 'macaw',
    name: 'Ара',
    shortName: 'ара',
    description:
      'Крупный яркий попугай с мощным клювом. Нуждается в большой клетке и ежедневном внимании.',
    features: ['Размер: крупный', 'Характер: общительный', 'Голос: очень громкий', 'Социальность: высокая'],
    size: 'крупный',
    lifespan: '50–80 лет',
    noiseLevel: 'очень высокий',
    image: 'images/parrots/macaw.jpg',
    imageAlt: 'Сине-жёлтый ара',
    imagePosition: '55% 28%',
  },
  {
    id: 'cockatoo',
    name: 'Какаду',
    shortName: 'какаду',
    description:
      'Эмоциональный попугай с выразительным хохолком. Сильно нуждается в общении и занятости.',
    features: ['Размер: крупный', 'Характер: очень привязчивый', 'Голос: громкий', 'Социальность: очень высокая'],
    size: 'крупный',
    lifespan: '40–70 лет',
    noiseLevel: 'очень высокий',
    image: 'images/parrots/cockatoo.jpg',
    imageAlt: 'Какаду',
    imagePosition: 'center center',
    imageFit: 'contain',
  },
  {
    id: 'amazon',
    name: 'Амазон',
    shortName: 'амазоне',
    description:
      'Яркий и уверенный в себе попугай. Хорошо обучается и любит рутинные занятия.',
    features: ['Размер: средний–крупный', 'Характер: харизматичный', 'Голос: громкий', 'Социальность: высокая'],
    size: 'средний–крупный',
    lifespan: '40–60 лет',
    noiseLevel: 'высокий',
    image: 'images/parrots/amazon.jpg',
    imageAlt: 'Амазон',
    imagePosition: '42% 18%',
  },
  {
    id: 'conure',
    name: 'Пиррура',
    shortName: 'пирруре',
    description:
      'Весёлая и подвижная птица. Любит игры, исследование и тесный контакт с человеком.',
    features: ['Размер: средний', 'Характер: игривый', 'Голос: звонкий', 'Социальность: высокая'],
    size: 'средний',
    lifespan: '15–30 лет',
    noiseLevel: 'высокий',
    image: 'images/parrots/conure.jpg',
    imageAlt: 'Пиррура',
    imagePosition: '32% 14%',
  },
  {
    id: 'rosella',
    name: 'Розелла',
    shortName: 'розелле',
    description:
      'Красочная австралийская птица. Активна, любопытна и ценит простор для движения.',
    features: ['Размер: средний', 'Характер: независимый', 'Голос: мелодичный', 'Социальность: средняя'],
    size: 'средний',
    lifespan: '15–20 лет',
    noiseLevel: 'средний',
    image: 'images/parrots/rosella.jpg',
    imageAlt: 'Розелла',
    imagePosition: '40% 30%',
  },
  {
    id: 'quaker',
    name: 'Квакер',
    shortName: 'квакере',
    description:
      'Умный и разговорчивый попугай. Известен строительством гнёзд из веточек и высокой обучаемостью.',
    features: ['Размер: средний', 'Характер: уверенный', 'Голос: способный к речи', 'Социальность: высокая'],
    size: 'средний',
    lifespan: '20–30 лет',
    noiseLevel: 'средний–высокий',
    image: 'images/parrots/quaker.jpg',
    imageAlt: 'Квакер',
    imagePosition: '45% 18%',
  },
  {
    id: 'eclectus',
    name: 'Эклектус',
    shortName: 'эклектусе',
    description:
      'Яркий попугай с особыми пищевыми потребностями: много овощей, фруктов и зелени.',
    features: ['Размер: средний–крупный', 'Характер: спокойный', 'Голос: умеренный', 'Социальность: средняя'],
    size: 'средний–крупный',
    lifespan: '30–50 лет',
    noiseLevel: 'средний',
    image: 'images/parrots/eclectus.jpg',
    imageAlt: 'Эклектус',
    imagePosition: '48% 18%',
  },
]

const SPECIES_MAP = Object.fromEntries(
  SPECIES.map((s) => [s.id, s]),
)

function getSpecies(id) {
  if (!id) return null
  return SPECIES_MAP[id] ?? null
}

window.SPECIES = SPECIES;
window.SPECIES_MAP = Object.fromEntries(SPECIES.map((s) => [s.id, s]));
window.getSpecies = getSpecies;
