import { CatchAsyncError } from "../middlewares/catchAsyncErrors.js"
import { layoutModel } from "../models/layout.model.js"
import { ErrorHandler } from "../utils/ErrorHandler.js"
import cloudinary from "cloudinary"

// create layout

export const createLayout = CatchAsyncError(async (req, res, next) => {
    try {
        const {type} = req.body
        const isTypeExist = await layoutModel.findOne({type})

        if(isTypeExist){
            return next(new ErrorHandler(`${type} already exists`, 400))
        }

        if(type === "Banner"){
            const {image, title, subTitle} = req.body
            const myCloud = await cloudinary.v2.uploader.upload(image, {
                folder: "layout"
            })
            const banner = {
                image: {
                    public_id: myCloud.public_id,
                    url: myCloud.secure_url
                },
                title,
                subTitle
            }
            await layoutModel.create({type, banner})
        }

        if(type === "FAQ"){
            const {faq} = req.body
            await layoutModel.create({type, faq})
        }
        if(type === "Categories"){
            const {categories} = req.body
            await layoutModel.create({type, categories})
        }

        res.status(201).json({
            success: true,
            message: "Layout created successfully"
        })
        
    } catch (error) {
        return next(new ErrorHandler(error.message, 500))
    }
})


// edit layout
export const editLayout = CatchAsyncError(async (req, res, next) => {
    try {
        const {type} = req.body
        
        const existingLayout = await layoutModel.findOne({type})

        if(!existingLayout){
            return next(new ErrorHandler(`${type} layout not found`, 404))
        }


        if(type === "Banner"){
            const {image, title, subTitle} = req.body

            if(existingLayout.banner?.image?.public_id){
                await cloudinary.v2.uploader.destroy(existingLayout.bannerData.image.public_id)

            }

            
            const myCloud = await cloudinary.v2.uploader.upload(image, {
                folder: "layout"
            })
            const banner = {
                image: {
                    public_id: myCloud.public_id,
                    url: myCloud.secure_url
                },
                title,
                subTitle
            }
            await layoutModel.findByIdAndUpdate(existingLayout._id, {banner}, {new: true})
        }

        if(type === "FAQ"){
            const {faq} = req.body
            await layoutModel.findByIdAndUpdate(existingLayout._id, {faq}, {new: true})
        }
        if(type === "Categories"){
            const {categories} = req.body
            await layoutModel.findByIdAndUpdate(existingLayout._id, {categories}, {new: true})
        }

        res.status(201).json({
            success: true,
            message: "Layout updated successfully"
        })
    } catch (error) {
        return next(new ErrorHandler(error.message, 500))
    }
})

// get layout by type
export const getLayoutByType = CatchAsyncError(async (req, res, next) => {
    try {
        const {type} = req.params
        const layout = await layoutModel.findOne({type})
        res.status(200).json({
            success: true,
            layout,
        })
    } catch (error) {
        return next(new ErrorHandler(error.message, 500))
    }
})