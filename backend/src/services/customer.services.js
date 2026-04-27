const prisma = require('../config/prisma');

// Create
exports.createCustomer = async (data, orgId) => {
    try {
        return await prisma.customer.create({
            data: {
                ...data,
                orgId,
            },
        });
    } catch (error) {
        throw error;
    }
};

// Get All
exports.getAllCustomers = async (orgId, search) => {
    try {
        const where = { orgId };

        if (search) {
            where.OR = [
                { name: { contains: search, mode: 'insensitive' } },
                { phone: { contains: search, mode: 'insensitive' } },
            ];
        }

        return await prisma.customer.findMany({
            where,
            orderBy: { createdAt: 'desc' },
        });
    } catch (error) {
        throw error;
    }
};

exports.getCustomerById = async (id, orgId) => {
    try {
        return await prisma.customer.findFirst({
            where: {
                id,
                orgId,
            },
        });
    } catch (error) {
        throw error;
    }
};

exports.updateCUstomer = async (id, data, orgId) => {
    try {
        return await prisma.customer.updateMany({
            where: { id, orgId },
            data,
        });
    } catch (error) {
        throw error;
    }
};

exports.deleteCustomer = async (id, orgId) => {
    try {
        return await prisma.customer.deleteMany({
            where: { id, orgId },
        });
    } catch (error) {
        throw error;
    }
};