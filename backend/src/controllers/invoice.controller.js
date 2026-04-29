const invoiceService = require("../services/invoice.service");

exports.createInvoice = async (req, res) => {
    try {
        const { customerId, items, type, paid } = req.body;
        const orgId = req.user?.orgId;

        if (!orgId) {
            return res.status(401).json({
                success: false,
                message: "Organization ID not found",
            });
        }

        const invoice = await invoiceService.createInvoice(
            { customerId, items, type, paid },
            orgId
        );

        return res.status(201).json({
            success: true,
            message: "Invoice created successfully",
            data: invoice,
        });
    } catch (error) {
        console.error("Create invoice error:", error);
        return res.status(400).json({
            success: false,
            message: error.message || "Failed to create invoice",
        });
    }
};

exports.getInvoices = async (req, res) => {
    try {
        const orgId = req.user?.orgId;
        const { customerId, type, page, limit } = req.query;

        if (!orgId) {
            return res.status(401).json({
                success: false,
                message: "Organization ID not found",
            });
        }

        const filters = {
            customerId: customerId || null,
            type: type || null,
            page: parseInt(page) || 1,
            limit: parseInt(limit) || 10,
        };

        const result = await invoiceService.getInvoices(orgId, filters);

        return res.status(200).json({
            success: true,
            message: "Invoices retrieved successfully",
            ...result,
        });
    } catch (error) {
        console.error("Get invoices error:", error);
        return res.status(400).json({
            success: false,
            message: error.message || "Failed to retrieve invoices",
        });
    }
};

exports.getInvoiceById = async (req, res) => {
    try {
        const { id } = req.params;
        const orgId = req.user?.orgId;

        if (!orgId) {
            return res.status(401).json({
                success: false,
                message: "Organization ID not found",
            });
        }

        const invoice = await invoiceService.getInvoiceById(id, orgId);

        return res.status(200).json({
            success: true,
            message: "Invoice retrieved successfully",
            data: invoice,
        });
    } catch (error) {
        console.error("Get invoice error:", error);
        return res.status(404).json({
            success: false,
            message: error.message || "Invoice not found",
        });
    }
};

exports.updatePayment = async (req, res) => {
    try {
        const { id } = req.params;
        const { amount, type } = req.body;
        const orgId = req.user?.orgId;

        if (!orgId) {
            return res.status(401).json({
                success: false,
                message: "Organization ID not found",
            });
        }

        const invoice = await invoiceService.updateInvoicePayment(id, orgId, {
            amount,
            type,
        });

        return res.status(200).json({
            success: true,
            message: "Payment updated successfully",
            data: invoice,
        });
    } catch (error) {
        console.error("Update payment error:", error);
        return res.status(400).json({
            success: false,
            message: error.message || "Failed to update payment",
        });
    }
};

exports.deleteInvoice = async (req, res) => {
    try {
        const { id } = req.params;
        const orgId = req.user?.orgId;

        if (!orgId) {
            return res.status(401).json({
                success: false,
                message: "Organization ID not found",
            });
        }

        const invoice = await invoiceService.deleteInvoice(id, orgId);

        return res.status(200).json({
            success: true,
            message: "Invoice deleted successfully",
            data: invoice,
        });
    } catch (error) {
        console.error("Delete invoice error:", error);
        return res.status(400).json({
            success: false,
            message: error.message || "Failed to delete invoice",
        });
    }
};

exports.getInvoiceSummary = async (req, res) => {
    try {
        const orgId = req.user?.orgId;

        if (!orgId) {
            return res.status(401).json({
                success: false,
                message: "Organization ID not found",
            });
        }

        const summary = await invoiceService.getInvoiceSummary(orgId);

        return res.status(200).json({
            success: true,
            message: "Invoice summary retrieved successfully",
            data: summary,
        });
    } catch (error) {
        console.error("Get invoice summary error:", error);
        return res.status(400).json({
            success: false,
            message: error.message || "Failed to retrieve invoice summary",
        });
    }
};
