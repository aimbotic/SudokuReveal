export const REWARD_IMAGES = {
  'reward1.jpg': require('../assets/reward1.jpg'),
  'reward2.jpg': require('../assets/reward2.jpg'),
  'reward3.jpg': require('../assets/reward3.jpg'),
  'reward4.jpg': require('../assets/reward4.jpg'),
  'nature_forest_lake.jpg': require('../assets/nature_forest_lake.jpg'),
  'nature_mountain_lake.jpg': require('../assets/nature_mountain_lake.jpg'),
  'nature_waterfall.jpg': require('../assets/nature_waterfall.jpg'),
  'nature_pine_forest.jpg': require('../assets/nature_pine_forest.jpg'),
  'nature_meadow.jpg': require('../assets/nature_meadow.jpg'),
  'nature_rainforest.jpg': require('../assets/nature_rainforest.jpg'),
};

export function getRewardImageSource(reward) {
  return REWARD_IMAGES[reward] ?? null;
}
