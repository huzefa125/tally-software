const customerService = require("../services/customer.services");

exports.createCustomer = async (req, res) => {
  try {
    const customer = await customerService.createCustomer(
      req.body,
      req.user.orgId,
    );
    res.json(customer).status(201);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getAllCustomers = async (req, res) => {
  try {
    const customers = await customerService.getAllCustomers(req.user.orgId);
    res.json(customers).status(200);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getCustomer = async (req,res) => {
    try {
        const customer = await customerService.getCustomerById(req.params.id,req.user.orgId);
        res.json(customer).status(200);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

exports.updateCustomer = async(req,res) => {
    try {
        const customer = await customerService.updateCUstomer(req.params.id,req.body,req.user.orgId);
        res.json(customer).status(200);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

exports.deleteCustomer = async(req,res) => {
    try {
        const customer = await customerService.deleteCustomer(req.params.id,req.user.orgId);
        res.json(customer).status(200);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}