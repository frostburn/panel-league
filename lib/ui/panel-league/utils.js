// These values mirror variables.less
const baseValue = 2.5;
const unit = 'em';


export const getBlockSize = (value) => `${value * baseValue}${unit}`;
