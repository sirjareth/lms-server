const Batch = require("../models/Batch");
const { errorHandler } = require("../auth");

module.exports.createBatch = async (req, res) => {
  try {
    const newBatch = await Batch.create(req.body);
    return res.status(201).send({ message: "Batch created successfully", batch: newBatch });
  } catch (error) {
    return errorHandler(error, req, res);
  }
};

module.exports.getAllBatches = async (req, res) => {
  try {
    const batches = await Batch.find({});
    return res.status(200).send(batches);
  } catch (error) {
    return errorHandler(error, req, res);
  }
};

module.exports.getBatch = async (req, res) => {
  try {
    const batch = await Batch.findById(req.params.id);
    if (!batch) return res.status(404).send({ message: "Batch not found" });
    return res.status(200).send(batch);
  } catch (error) {
    return errorHandler(error, req, res);
  }
};

module.exports.updateBatch = async (req, res) => {
  try {
    const updatedBatch = await Batch.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updatedBatch) return res.status(404).send({ message: "Batch not found" });
    return res.status(200).send({ message: "Batch updated successfully", batch: updatedBatch });
  } catch (error) {
    return errorHandler(error, req, res);
  }
};

module.exports.archiveBatch = async (req, res) => {
  try {
    const archivedBatch = await Batch.findByIdAndUpdate(req.params.id, { isArchived: true }, { new: true });
    if (!archivedBatch) return res.status(404).send({ message: "Batch not found" });
    return res.status(200).send({ message: "Batch archived successfully", batch: archivedBatch });
  } catch (error) {
    return errorHandler(error, req, res);
  }
};
