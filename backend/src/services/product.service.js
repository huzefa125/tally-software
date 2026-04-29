const prisma = require("../config/prisma");

exports.createProduct = async (data, orgId) => {
    try {
        return await prisma.product.create({
            data: {
                ...data,
                orgId,
            }
        })
    } catch (error) {
        throw error;
    }
}

exports.getAllProducts = async (orgId, search) => {
    try {
        return await prisma.product.findMany({
            where : {
                orgId,
                ...(search && {
                    name:{
                        contains: search,
                        mode: 'insensitive'
                    },
                })
            },
            orderBy : {createdAt: 'desc'}
        })
    } catch (error) { 
        throw error;
    }
}

exports.getProduct = async (id,orgId) => {
    try {
        return await prisma.product.findOne({
            where : {
                id,
                orgId,
            }
        })
    } catch (error) {
        throw error;
    }
}

exports.updateProduct = async (id,data,orgId) => {
    try {
        return await prisma.product.updateMany({
            where : {
                id,
                orgId,
            },
            data,
        })
    } catch (error) {
        throw error;
    }
}

exports.deleteProduct = async (id,orgId) => {
    try {
        return await prisma.product.deleteMany({
            where : {
                id,
                orgId,
            }
        })
    } catch (error) {
        throw error;
    }
}