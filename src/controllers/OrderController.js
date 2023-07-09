const User = require('../models/UserModel');
const Product = require('../models/ProductModel');
const Order = require('../models/OrderModel');
const Cart = require('../models/CartModel');
const mongoose = require('mongoose');

/*
POST /users/:userId/orders
Create an order for the user
Make sure the userId in params and in JWT token match.
Make sure the user exist
Get cart details in the request body
*/
const createOrder = async (req, res) => {
    try {
        const { userId } = req.params;
        const { cartId } = req.body;
        const userIdFromToken = req.userId;

        // // items validation
        // if(!items) {
        //     return res.status(400).json({
        //         status: false,
        //         message: "Items is required"
        //     });
        // }

        // if(!items.productId) {
        //     return res.status(400).json({
        //         status: false,
        //         message: "Product id is required"
        //     });
        // }
        // if(!items.quantity) {
        //     return res.status(400).json({
        //         status: false,
        //         message: "Quantity is required"
        //     });
        // }
        // if(items.quantity < 1) {
        //     return res.status(400).json({
        //         status: false,
        //         message: "Quantity must be greater than 0"
        //     });
        // }

        // // totalQuantity validation
        // if(!totalQuantity) {
        //     return res.status(400).json({
        //         status: false,
        //         message: "Total quantity is required"
        //     });
        // }

        // // totalItems validation
        // if(!totalItems) {
        //     return res.status(400).json({
        //         status: false,
        //         message: "Total items is required"
        //     });
        // }

        // // totalPrice validation
        // if(!totalPrice) {
        //     return res.status(400).json({
        //         status: false,
        //         message: "Total price is required"
        //     });
        // }
        

        // Check if the userId is valid
        if(!mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({
                status: false,
                message: "Invalid userId"
            });
        }  

        // Check if the user exists
        const user = await User.findById(userId);
        if(!userId) {
            return res.status(404).json({
                status: false,
                message: "User not found"
            });
        }

        // Check if the userId in params and in JWT token match
        if(user._id.toString() !== userIdFromToken) {
            return res.status(401).json({
                status: false,
                message: "Unauthorized! You are not allowed to create Order"
            });
        }

        // Get cart details in the request body
        // Retrieve the cart based on the cartId provided
        const cart = await Cart.findOne({ _id: cartId });
        if(!cart) {
            return res.status(404).json({
                status: false,
                message: "Cart not found"
            });
        }

        // if cart is empty return a message "Your cart is empty. Please add items to your cart for checkout"
        if(cart.items.length === 0) {
            return res.status(200).json({
                status: true,
                message: "Your cart is empty. Please add items to your cart for checkout!"
            });
        }

        // Fetch the product details for the cart items
        const products = await Product.find({ 
            _id: { $in: cart.items.map(item => item.productId) }, 
            isDeleted: false 
        });

        // Map the product details to the order items
        const orderItems = cart.items.map(item => {
            const product = products.find(product => product._id.toString() === item.productId);
            return {
                productId: item.productId,
                quantity: item.quantity,
                product: product
            }
        });

        // Calculate the total price, total items, and total quantity for the order
        const totalPrice = cart.totalPrice;
        const totalItems = cart.totalItems;
        const totalQuantity = cart.items.reduce((acc, item) => acc + item.quantity, 0);

        // Create the order
        // Create a new Order document with the required fields
        const order = new Order({
            userId,
            items: orderItems,
            totalPrice,
            totalItems,
            totalQuantity,
            // cancellable: true,
            // status: 'pending',
        });

        await order.save();

        // Delete the cart - Mark the cart as deleted
        // cart.isDeleted = true;
        // cart.deletedAt = new Date();        
        // await cart.save();

        // Empty the cart
        cart.items = [];
        cart.totalPrice = 0;
        cart.totalItems = 0;
        await cart.save();


        res.status(201).json({
            status: true,
            message: "Order created successfully",
            data: order
        });


    } catch (err) {
        return res.status(500).json({
            status: false,
            message: err.message
        });
    }
}



/*
PUT /users/:userId/orders
Updates an order status
Make sure the userId in params and in JWT token match.
Make sure the user exist
Get order id in request body
Make sure the order belongs to the user
Make sure that only a cancellable order could be canceled. Else send an appropriate error message and response. 
*/

const updateOrder = async (req, res) => {
    try {
        const { userId } = req.params;
        const { orderId, status } = req.body;
        const userIdFromToken = req.userId;

        // Check if the userId is valid
        if(!mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({
                status: false,
                message: "Invalid userId"
            });
        }

        // Check if the user exists
        const user = await User.findById(userId);
        if(!userId) {
            return res.status(404).json({
                status: false,
                message: "User not found"
            });
        }

        // Check if the userId in params and in JWT token match
        if(user._id.toString() !== userIdFromToken) {
            return res.status(403).json({
                status: false,
                message: "Unauthorized! You are not allowed to update Order"
            });
        }

        // check if orderId is valid 
        if(!mongoose.Types.ObjectId.isValid(orderId)) {
            return res.status(400).json({
                status: false,
                message: "Invalid orderId"
            });
        }

        // status validation
        if(status) {
            if(!['pending', 'cancelled', 'completed'].includes(status)) {
                return res.status(400).json({
                    status: false,
                    message: "Invalid status"
                });
            }
        }

        // Check if the order exists
        const order = await Order.findById(orderId);
        if(!orderId) {
            return res.status(404).json({
                status: false,
                message: "Order not found"
            });
        }

        // Check if the order belongs to the user
        if(order.userId.toString() !== userId) {
            return res.status(403).json({
                status: false,
                message: "Unauthorized! You are not allowed to update Order"
            });
        }

        // Make sure that only a cancellable order could be canceled. Else send an appropriate error message and response.
        if(!order.cancellable && status === 'cancelled') {
            return res.status(400).json({
                status: false,
                message: "Order is not cancellable"
            });
        }
        // if(!order.cancellable) {
        //     return res.status(400).json({
        //         status: false,
        //         message: "Order is not cancellable"
        //     });
        // }

        order.status = status;
        await order.save();

        res.status(200).json({
            status: true,
            message: "Order updated successfully",
            data: order
        })

    } catch (err) {
        return res.status(500).json({
            status: false,
            message: err.message
        });
    }
}


module.exports ={
    createOrder,
    updateOrder
}