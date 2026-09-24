/**
 * Static site content: authorship, links, and every number quoted from the
 * paper. Keeping it here means the copy can be edited without touching JSX.
 */

export const TITLE =
  'NavGen: Visual Generative Models as a Scalable Data Engine for Embodied 3D Navigation'

export const SHORT_TITLE = 'NavGen'

export const AUTHORS = [
  { name: 'Xijie Huang', aff: [1, 2] },
  { name: 'Yongyang Wan', aff: [2] },
  { name: 'Chengbin Dong', aff: [2] },
  { name: 'Zimo Ding', aff: [2] },
  { name: 'Mo Zhu', aff: [1, 2] },
  { name: 'Yijin Wang', aff: [1, 2] },
  { name: 'Zhiyang Liu', aff: [2] },
  { name: 'Fei Gao', aff: [1, 2] },
  { name: 'Yuze Wu', aff: [1, 2], corresponding: true },
  { name: 'Xin Zhou', aff: [2] },
]

export const AFFILIATIONS = [
  { id: 1, text: 'Zhejiang University' },
  { id: 2, text: 'Differential Robotics' },
]

export const LINKS = {
  // Anything left null renders as a dimmed "soon" chip rather than a dead link.
  paper: 'paper.pdf',
  modelscope: 'https://www.modelscope.cn/datasets/xinjiu612/NavGen',
  huggingface: 'https://huggingface.co/datasets/xinjiu/NavGen',
  code: 'https://github.com/xinjiu612/NavGen-code',
  arxiv: null, // add the arXiv abs URL here once the paper is posted
  video: null,
}

export const BIBTEX = `@article{huang2027navgen,
  title   = {NavGen: Visual Generative Models as a Scalable Data Engine
             for Embodied 3D Navigation},
  author  = {Huang, Xijie and Wan, Yongyang and Dong, Chengbin and Ding, Zimo
             and Zhu, Mo and Wang, Yijin and Liu, Zhiyang and Gao, Fei
             and Wu, Yuze and Zhou, Xin},
  journal = {Under review},
  year    = {2027}
}`

/* -------------------------------------------------------------------------- */
/*  headline numbers                                                          */
/* -------------------------------------------------------------------------- */

export const HEADLINE_STATS = [
  { value: 400, suffix: 'K', label: 'generated episodes', sub: '300K common + 100K long-tail' },
  { value: 2.8, suffix: '×', label: 'more diverse', sub: 'Vendi Score 47.6 vs 16.8', decimals: 1 },
  { value: 0.806, suffix: '', label: 'FD-CLIP sim-to-real', sub: 'best among non-real datasets', decimals: 3 },
  { value: 75, suffix: '%', label: 'zero-shot success', sub: 'unseen indoor + outdoor tasks' },
  { value: 47, suffix: ' FPS', label: 'onboard inference', sub: '0.7 s per clip' },
]

/* -------------------------------------------------------------------------- */
/*  pipeline                                                                  */
/* -------------------------------------------------------------------------- */

export const PIPELINE = [
  {
    id: 'prompt',
    index: '01',
    kicker: 'Diversity at scale',
    title: 'Embodied navigation descriptions',
    lead:
      'Prompting a VLM directly collapses into near-duplicate text once the ' +
      'dataset reaches hundreds of thousands of samples. We instead anchor ' +
      'diversity in an explicit object inventory.',
    points: [
      ['1M', 'objects in the Cap3D source inventory'],
      ['300K', 'target objects kept after filtering uncommon ones'],
      ['Qwen3.6-27B', 'acts as an embodied navigation expert, imagining environment style, background objects, spatial layout and target context around each object'],
      ['Balanced', 'every sample is assigned to a predefined motion category so the motion prior stays uniform'],
    ],
    media: 'wordcloud',
  },
  {
    id: 't2v',
    index: '02',
    kicker: 'Scale',
    title: 'Common-task episodes from an open model',
    lead:
      'The generated descriptions drive a step-distilled open-source video ' +
      'model to produce the bulk of the corpus at low cost.',
    points: [
      ['Wan2.2 14B T2V', 'step-distilled, sampling in only four diffusion steps'],
      ['≈36 s', 'wall-clock per 720p episode on a single A100'],
      ['300K', 'vision-language navigation episodes covering common tasks'],
    ],
    media: 'gallery',
  },
  {
    id: 'rebalance',
    index: '03',
    kicker: 'Debiasing',
    title: 'Motion rebalancing',
    lead:
      'Video models do not strictly obey the requested motion, which biases ' +
      'the action distribution of the dataset — and therefore of the policy.',
    points: [
      ['Pi3', 'decodes the overall motion direction of every generated video and assigns it a motion label'],
      ['Mirror', 'horizontal flip fixes left–right imbalance'],
      ['Reverse', 'temporal reversal fixes forward–backward imbalance'],
      ['+15%', 'navigation success rate from rebalancing alone — no extra generation required'],
    ],
    media: 'analysis',
  },
  {
    id: 'diversify',
    index: '04',
    kicker: 'Long tail',
    title: 'Style diversification',
    lead:
      'Hard behaviours — squeezing through narrow gaps, orbiting a target — ' +
      'need a stronger model, but only 10K such clips are affordable. ' +
      'We multiply them by rewriting the scene, not the motion.',
    points: [
      ['Seedance 2.0', 'generates 10K high-quality long-tail clips with strong temporal consistency'],
      ['Qwen3.6-27B', 'writes a diversification description from the first frame: keep the object shape, change surroundings, style and appearance'],
      ['Qwen-Image-Edit', 're-renders that first frame accordingly'],
      ['MoGe-2 → LTX-2.3', 'depth video from the original clip drives a reference-conditioned V2V model, lifting 10K to 100K'],
    ],
    media: 'diversify',
  },
  {
    id: 'filter',
    index: '05',
    kicker: 'Quality control',
    title: 'Filtering and re-annotation',
    lead:
      'Generative models occasionally hallucinate. Anything that breaks ' +
      'consistency is dropped and resampled, and every surviving clip is ' +
      're-captioned from what it actually shows.',
    points: [
      ['VBench', 'clips below a quality threshold, or below navigation grade L2, are discarded and regenerated from fresh descriptions'],
      ['11 frames', 'uniformly sampled per clip and captioned by Qwen3.6-27B'],
      ['Pi3 motion cue', 'fed to the captioner because VLMs are weak at spatial direction, which sharpens the re-annotated prompts'],
    ],
    media: 'rubric',
  },
]

export const DIVERSITY_BARS = [
  { name: 'TravelUAV', vendi: 8.8, fd: 0.973 },
  { name: 'IndoorUAV', vendi: 16.8, fd: 0.969 },
  { name: 'OpenFly', vendi: 12.3, fd: 0.833 },
  { name: 'UAV-Flow', vendi: 7.4, fd: 0.691, real: true },
  { name: 'Ours', vendi: 47.6, fd: 0.806, ours: true },
]

export const MOTION_SPLIT = [
  { label: 'W', pct: 25.9, note: 'forward' },
  { label: 'W+A+R', pct: 10.7, note: 'forward + ascend + rotate' },
  { label: 'W+D+L', pct: 10.7, note: 'forward + descend + lateral' },
  { label: 'S', pct: 8.3, note: 'stationary / slow' },
  { label: 'W+L', pct: 7.4, note: 'forward + lateral' },
  { label: 'W+R', pct: 7.2, note: 'forward + rotate' },
  { label: 'Other', pct: 29.8, note: 'mixed manoeuvres' },
]

export const NAV_RUBRIC = [
  { level: 'L0', text: 'No usable navigation.' },
  { level: 'L1', text: 'Usable navigation, but the prompted motion is not fully followed.' },
  { level: 'L2', text: 'The prompted motion is followed, but the target view is not reached.' },
  { level: 'L3', text: 'The prompted motion is followed and the target view is reached.' },
]

export const SECTIONS = [
  { id: 'overview', label: 'Overview' },
  { id: 'pipeline', label: 'Pipeline' },
  { id: 'data', label: 'Data' },
  { id: 'analysis', label: 'Analysis' },
  { id: 'benchmark', label: 'Benchmark' },
  { id: 'realworld', label: 'Real world' },
  { id: 'cite', label: 'Cite' },
]
