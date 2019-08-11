
// Exponential moving average filter
class ExpMovAve {
  constructor(alpha, mean) {
    this.alpha = alpha;
    this.mean = !mean ? 0 : mean;
    this.variance = 0;
  }
  get beta() {
    return 1 - this.alpha;
  }

  update(newValue) {
    const redistributedMean = this.beta * this.mean;
    const meanIncrement = this.alpha * newValue;
    const newMean = redistributedMean + meanIncrement;
    const varianceIncrement = this.alpha * (newValue - this.mean) ** 2;
    const newVariance = this.beta * (this.variance + varianceIncrement);
    this.mean = newMean;
    this.variance = newVariance;
  }

  get stdev() {
    return Math.sqrt(this.variance);
  }
}

// Exponential moving average filter with weights
class ExpMovAveWeights extends ExpMovAve {
  constructor(alpha, mean) {
    super(alpha, mean)
    this.weights = [1]
  }

  update(newValue) {
    super.update(newValue)

    const updateWeights = this.weights.map(w => w * this.beta)

    this.weights = updateWeights

    this.weights.push(this.alpha)
  }
}

// Simple moving avarage calculator
class MovingAverageCalculator {
  constructor() {
    this.count = 0;
    this.mean = 0;
  }
  update(newValue) {
    this.count++;
    const differential = (newValue - this.mean) / this.count;
    const newMean = this.mean + differential;
    this.mean = newMean;
  }

  getMean() {
    this.validate();
    return this.mean;

  }

  validate() {
    if (this.count == 0) {
      throw new Error('Mean is undefined')
    }
  }
}

class RunningAverageCalculator {
  constructor() {
    this.count = 0;
    this.mean = 0;
    this.alpha = .8;
  }

  update(newValue) {
    this.count++;
    const differential = (newValue - this.mean) / this.count;
    const newMean = this.mean + differential;
    var avg = newMean * this.alpha + newValue * (1 - this.alpha);
    this.mean = avg;
  }

  getMean() {
    this.validate();
    return this.mean;

  }

  validate() {
    if (this.count == 0) {
      throw new Error('Mean is undefined')
    }
  }
}



