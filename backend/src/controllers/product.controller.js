const service = require("../services/product.service");

exports.createProduct = async (req,res) => {
    try {
        const product = await service.createProduct(req.body,req.user.orgId);
        res.json(product).status(201);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
}

exports.getAllProducts = async (req,res) => {
    try {
        const products = await service.getAllProducts(req.user.orgId,req.query.search);
        res.status(201).json(products);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
}

exports.getProduct = async (req,res) => {
    try {
        const product = await service.getProduct(req.params.id,req.user.orgId);
        res.status(201).json(product);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
}

exports.updateProduct = async (req,res) => {
    try {
        const product = await service.updateProduct(req.params.id,req.body,req.user.orgId);
        res.status(201).json(product);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
}

exports.deleteProduct = async (req,res) => {
    try {
        const product = await service.deleteProduct(req.params.id,req.user.orgId);      
        res.status(201).json(product);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }   
}