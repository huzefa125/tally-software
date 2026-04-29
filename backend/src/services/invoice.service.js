const prisma = require("../config/prisma");

exports.createInvoice = async (payLoad, orgId) => {
    try {
        const { customerId, items, type, paid = 0 } = payLoad;

        if (!customerId || !items || !items.length) {
            throw new Error("Invalid payload: customerId and items are required");
        }

        if (!type || !["CASH", "UDHAAR"].includes(type)) {
            throw new Error("Invalid invoice type. Must be CASH or UDHAAR");
        }

        return prisma.$transaction(async (tx) => {
            // 1. Verify customer exists and belongs to organization
            const customer = await tx.customer.findFirst({
                where: {
                    id: customerId,
                    orgId,
                },
            });

            if (!customer) {
                throw new Error("Customer not found");
            }

            // 2. Fetch product details and calculate total
            const productIds = items.map((i) => i.productId);

            const products = await tx.product.findMany({
                where: {
                    id: {
                        in: productIds,
                    },
                    orgId,
                },
            });

            if (products.length !== items.length) {
                throw new Error("One or more products not found");
            }

            let totalAmount = 0;
            const invoiceItemsData = items.map((item) => {
                const product = products.find((p) => p.id === item.productId);

                if (!product) {
                    throw new Error(`Product ${item.productId} not found`);
                }

                const price = product.price;
                const lineTotal = price * item.quantity;
                totalAmount += lineTotal;

                return {
                    productId: item.productId,
                    quantity: item.quantity,
                    price,
                };
            });

            // 3. Calculate payment amounts
            const paidAmount = Math.min(paid, totalAmount);
            const dueAmount = totalAmount - paidAmount;

            // 4. Create invoice with items
            const invoice = await tx.invoice.create({
                data: {
                    customerId,
                    orgId,
                    total: totalAmount,
                    paid: paidAmount,
                    due: dueAmount,
                    type,
                    items: {
                        create: invoiceItemsData,
                    },
                },
                include: {
                    items: true,
                    customer: {
                        select: { id: true, name: true, phone: true },
                    },
                },
            });

            return invoice;
        });
    } catch (error) {
        throw error;
    }
};

exports.getInvoices = async (orgId, filters = {}) => {
    try {
        const { customerId, type, page = 1, limit = 10 } = filters;

        const where = { orgId };
        if (customerId) where.customerId = customerId;
        if (type) where.type = type;

        const skip = (page - 1) * limit;

        const [invoices, total] = await Promise.all([
            prisma.invoice.findMany({
                where,
                skip,
                take: limit,
                include: {
                    items: true,
                    customer: {
                        select: { id: true, name: true, phone: true },
                    },
                },
                orderBy: { createdAt: "desc" },
            }),
            prisma.invoice.count({ where }),
        ]);

        return {
            data: invoices,
            pagination: {
                total,
                page,
                limit,
                pages: Math.ceil(total / limit),
            },
        };
    } catch (error) {
        throw error;
    }
};

exports.getInvoiceById = async (invoiceId, orgId) => {
    try {
        const invoice = await prisma.invoice.findFirst({
            where: {
                id: invoiceId,
                orgId,
            },
            include: {
                items: {
                    include: {
                        product: {
                            select: { id: true, name: true, price: true },
                        },
                    },
                },
                customer: {
                    select: { id: true, name: true, phone: true, balance: true },
                },
            },
        });

        if (!invoice) {
            throw new Error("Invoice not found");
        }

        return invoice;
    } catch (error) {
        throw error;
    }
};

exports.updateInvoicePayment = async (invoiceId, orgId, paymentData) => {
    try {
        const { amount, type } = paymentData;

        if (!amount || amount <= 0) {
            throw new Error("Invalid payment amount");
        }

        return prisma.$transaction(async (tx) => {
            const invoice = await tx.invoice.findFirst({
                where: {
                    id: invoiceId,
                    orgId,
                },
            });

            if (!invoice) {
                throw new Error("Invoice not found");
            }

            const newPaid = Math.min(invoice.paid + amount, invoice.total);
            const newDue = invoice.total - newPaid;

            const updatedInvoice = await tx.invoice.update({
                where: { id: invoiceId },
                data: {
                    paid: newPaid,
                    due: newDue,
                },
                include: {
                    items: true,
                    customer: {
                        select: { id: true, name: true, phone: true },
                    },
                },
            });

            return updatedInvoice;
        });
    } catch (error) {
        throw error;
    }
};

exports.deleteInvoice = async (invoiceId, orgId) => {
    try {
        return prisma.$transaction(async (tx) => {
            const invoice = await tx.invoice.findFirst({
                where: {
                    id: invoiceId,
                    orgId,
                },
            });

            if (!invoice) {
                throw new Error("Invoice not found");
            }

            // Delete associated invoice items first
            await tx.invoiceItem.deleteMany({
                where: { invoiceId },
            });

            // Delete the invoice
            const deletedInvoice = await tx.invoice.delete({
                where: { id: invoiceId },
            });

            return deletedInvoice;
        });
    } catch (error) {
        throw error;
    }
};

exports.getInvoiceSummary = async (orgId) => {
    try {
        const [totalInvoices, totalAmount, paidAmount, dueAmount] = await Promise.all([
            prisma.invoice.count({ where: { orgId } }),
            prisma.invoice.aggregate({
                where: { orgId },
                _sum: { total: true },
            }),
            prisma.invoice.aggregate({
                where: { orgId },
                _sum: { paid: true },
            }),
            prisma.invoice.aggregate({
                where: { orgId },
                _sum: { due: true },
            }),
        ]);

        return {
            totalInvoices,
            totalAmount: totalAmount._sum.total || 0,
            paidAmount: paidAmount._sum.paid || 0,
            dueAmount: dueAmount._sum.due || 0,
        };
    } catch (error) {
        throw error;
    }
};