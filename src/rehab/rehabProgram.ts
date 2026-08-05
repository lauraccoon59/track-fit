import type { RehabCircuitTemplate } from './rehab.types'

/**
 * Catalogue des circuits de rééducation.
 * Ajouter un nouveau circuit ici suffit pour l’étendre plus tard.
 */
export const REHAB_CIRCUITS: RehabCircuitTemplate[] = [
  {
    id: 'circuit-kine-genou',
    name: 'Circuit Kiné Genou',
    description:
      'Circuit de rééducation du genou : échauffement vélo puis 4 exercices à répéter. Indépendant de la musculation.',
    defaultRounds: 5,
    defaultWarmupSeconds: 5 * 60,
    defaultRestBetweenRoundsSeconds: 90,
    estimatedMinutes: 35,
    warmup: {
      id: 'kine-velo',
      name: 'Vélo',
      mode: 'warmup',
      holdSeconds: 5 * 60,
      description: 'Échauffement avant le circuit',
      illustrationKey: 'bike',
      cues: [
        'Pédaler à intensité légère à modérée',
        'Respiration confortable',
        'Préparer les articulations sans forcer',
      ],
    },
    exercises: [
      {
        id: 'kine-fente-statique',
        name: 'Fente statique maintenue',
        mode: 'hold',
        holdSeconds: 30,
        perSide: true,
        illustrationKey: 'lunge-hold',
        description: 'Maintien isométrique en fente, une jambe puis l’autre',
        cues: [
          'Maintenir la position 30 secondes',
          'Jambe gauche, puis jambe droite',
          'Buste droit',
          'Genou aligné avec le pied',
          'Ne pas verrouiller complètement le genou',
        ],
      },
      {
        id: 'kine-chaise-swiss-ball',
        name: 'Chaise contre Swiss Ball',
        mode: 'hold',
        holdSeconds: 60,
        perSide: false,
        illustrationKey: 'wall-sit-ball',
        description: 'Position chaise avec le dos contre le ballon',
        cues: [
          'Dos contre le ballon',
          'Maintenir 1 minute',
          'Respirer normalement',
          'Garder les genoux alignés',
        ],
      },
      {
        id: 'kine-pont-fessier',
        name: 'Pont fessier unilatéral',
        mode: 'reps',
        repsTarget: 15,
        perSide: true,
        illustrationKey: 'single-glute-bridge',
        description: 'Pont fessier une jambe, contrôle de la descente',
        cues: [
          'Allongée sur le dos',
          'Une jambe maintenue verticale selon la consigne du kiné',
          'Lever le bassin',
          'Redescendre lentement',
          '15 répétitions jambe gauche, puis jambe droite',
        ],
      },
      {
        id: 'kine-equilibre',
        name: 'Équilibre sur une jambe',
        mode: 'hold',
        holdSeconds: 30,
        perSide: true,
        illustrationKey: 'single-leg-balance',
        description: 'Équilibre unipodal gainé',
        cues: [
          'Une jambe au sol',
          'L’autre levée à environ 90°',
          'Rester bien gainée',
          'Éviter que le bassin ne bascule',
        ],
      },
    ],
  },
]

export function getRehabCircuit(id: string): RehabCircuitTemplate | undefined {
  return REHAB_CIRCUITS.find((c) => c.id === id)
}

export const DEFAULT_REHAB_CIRCUIT_ID = 'circuit-kine-genou'
