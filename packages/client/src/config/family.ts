import type { PlayerId } from '@hh/shared';
import type { CharacterLook } from '../art/characters';

/**
 * The two family homes on Family Lane. Edit names, colours and lines freely.
 * `lines.qd` is what they say when qd visits, `lines.xb` when xb visits.
 * The pixel font has no Vietnamese accents, so names are written without them.
 */
export interface FamilyMember {
  id: string;
  name: string;
  look: Omit<CharacterLook, 'id' | 'name'>;
  lines: Record<PlayerId, string[]>;
}

export interface Family {
  houseName: string;
  sign: string;
  members: FamilyMember[];
}

export const FAMILIES: Record<PlayerId, Family> = {
  qd: {
    houseName: 'Nha ba Hanh',
    sign: "Nha ba Hanh\nqd's family",
    members: [
      {
        id: 'ba_hanh',
        name: 'Ba Hanh',
        look: { hair: '#3b2a3a', hairDark: '#241825', outfit: '#6f8fbf', outfitDark: '#4f6f9f', accent: '#241825', shoes: '#3b2a3a' },
        lines: {
          qd: ['qd! You came home. Sit, sit.', 'Are you eating well on that farm?', 'The house is quiet without you.', 'Tell xb to take good care of you.'],
          xb: ['Ah, xb. Come in, come in.', 'How is the farm doing?', 'Take good care of our qd.', 'Stay for dinner next time.'],
        },
      },
      {
        id: 'me_phuong',
        name: 'Me Phuong',
        look: { hair: '#5a3a2a', hairDark: '#3e2618', outfit: '#e07a8a', outfitDark: '#b85a6a', accent: '#ffd23f', shoes: '#6b3a2a' },
        lines: {
          qd: ['My girl! I cooked your favourite.', 'Do not work too hard, con.', 'Bring some strawberries next time!', 'Wear something warm tonight.'],
          xb: ['xb! Have you eaten yet?', 'Come visit more often, both of you.', 'I packed some snacks for the road.', 'You two look happy. Good.'],
        },
      },
      {
        id: 'em_vy',
        name: 'Em Vy',
        look: { hair: '#3b2a3a', hairDark: '#241825', outfit: '#ffb3d9', outfitDark: '#e08ab5', accent: '#ff5c8a', shoes: '#6b3a5a' },
        lines: {
          qd: ['Chi qd! Play with me later?', 'Your outfit is so cute!', 'Can I visit your farm?', 'I missed you, chi.'],
          xb: ['Anh xb! Where is chi qd?', 'Did you bring anything yummy?', 'Chi qd talks about you a lot.', 'Can I pet your farm animals?'],
        },
      },
      {
        id: 'em_sang',
        name: 'Em Sang',
        look: { hair: '#241825', hairDark: '#140c15', outfit: '#7de8c8', outfitDark: '#4fbf9f', accent: '#140c15', shoes: '#3b2a3a' },
        lines: {
          qd: ['Chi! Did you bring snacks?', 'I beat my high score today.', 'Chi, can we go fishing?', 'Mom made too much food again.'],
          xb: ['Anh xb! Teach me to fish?', 'Is the forest scary at night?', 'I want a puppy like yours.', 'Race you to the fountain!'],
        },
      },
    ],
  },
  xb: {
    houseName: 'Nha ba Thai',
    sign: "Nha ba Thai\nxb's family",
    members: [
      {
        id: 'ba_thai',
        name: 'Ba Thai',
        look: { hair: '#6a6a7a', hairDark: '#4a4a5a', outfit: '#8a5a33', outfitDark: '#5e3a1f', accent: '#4a4a5a', shoes: '#241825' },
        lines: {
          xb: ['Welcome home, son.', 'Working hard on the farm?', 'Your mother has been waiting.', 'Proud of you. Keep going.'],
          qd: ['qd, welcome! Make yourself at home.', 'Is xb treating you well?', 'Come by anytime, you hear?', 'The tea is fresh. Have some.'],
        },
      },
      {
        id: 'me_mai',
        name: 'Me Mai',
        look: { hair: '#3b2a3a', hairDark: '#241825', outfit: '#c58cff', outfitDark: '#9a5fe0', accent: '#ffe066', shoes: '#4a2a3f' },
        lines: {
          xb: ['Have you eaten? There is soup on the stove.', 'You look thinner, con.', 'Call home more often!', 'Bring qd for dinner soon.'],
          qd: ['qd! Come, I made something sweet.', 'You are always welcome here.', 'Is my son helping with the cooking?', 'Take some fruit home with you.'],
        },
      },
      {
        id: 'chi_nhi',
        name: 'Chi Nhi',
        look: { hair: '#6b4a2a', hairDark: '#4a3018', outfit: '#ffd86b', outfitDark: '#e0ae3a', accent: '#ff8fcf', shoes: '#6b3a2a' },
        lines: {
          xb: ['Look who finally visited!', 'Still messy as ever, little brother.', 'qd is too good for you, you know.', 'Bring me some honey next time.'],
          qd: ['qd! Is my little brother behaving?', 'Let us gang up on him later.', 'Love your hat!', 'Come shopping with me some day.'],
        },
      },
    ],
  },
};
