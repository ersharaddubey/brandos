import { Wifi, Car, Coffee, Trees, Mountain, Utensils, Sofa, PawPrint, Bath, Tv, Flame, Sun, Bed, Gamepad2, Music, Languages, Wind, ShieldCheck, Sparkles, CookingPot } from 'lucide-react';

const MAP = [
  [/wi-?fi|internet/i, Wifi], [/park/i, Car], [/breakfast|coffee|chai|kettle/i, Coffee], [/garden|outdoor|nature/i, Trees],
  [/mountain|view/i, Mountain], [/kitchen/i, CookingPot], [/lounge|living|desk/i, Sofa], [/pet/i, PawPrint],
  [/bath|toilet|shower|bidet|towel/i, Bath], [/tv|movie|entertain/i, Tv], [/heat|fire/i, Flame], [/terrace|balcony|sun/i, Sun],
  [/bed|linen|wardrobe|closet/i, Bed], [/game|board|puzzle/i, Gamepad2], [/music|live/i, Music], [/language/i, Languages],
  [/sound|air|wind/i, Wind], [/smok|safe|secur/i, ShieldCheck], [/dining|food|restaurant/i, Utensils],
];
export default function amenityIcon(text = '') {
  const hit = MAP.find(([re]) => re.test(text));
  return hit ? hit[1] : Sparkles;
}
