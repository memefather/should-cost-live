const ShouldCostEngine = require('../engine');
const engine = new ShouldCostEngine();

module.exports = async (req, res) => {
  if (req.method === 'POST') {
    try {
      const result = await engine.calculate(req.body);
      res.status(200).json(result);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  } else {
    res.status(405).send('Method Not Allowed');
  }
};
