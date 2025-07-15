import mongoose, { Schema } from "mongoose";

const reviewSchema = new mongoose.Schema({
    user: Object,
    rating: {
        type: Number,
        default: 0
    },
    comment: String,
    commentReplies: [Object]
})

const linkSchema = new mongoose.Schema({
    title: String,
    url: String
})

const questionSchema = new mongoose.Schema({
    user: Object,
    question: String,
    questionReplies: [Object]
}, {timestamps: true})

const courseDataSchema = new mongoose.Schema({
    videoUrl: String,
    title: String,
    videoSection: String,
    description: String,
    videoLength: String,
    videoPlayer: String,
    links: [linkSchema],
    suggestion: String,
    questions: [questionSchema]
})

const courseSchema = new mongoose.Schema({
    name:{
        type: String,
        required: true,
    },
    description:{
        type: String,
        required: true,
    }, 
    categories:{
        type: String, 
        required: true,
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    price:{
        type: Number,
        required: true,
    }, 
    estimatedPrice:{
        type: Number
    },
    priceUSD:{
        type: Number,
    }, 
    thumbnail:{
        public_id: {
            type: String,
            // required: true
        },
        url: {
            type: String,
            // required: true
        }
    },
    tags:{
        type: String,
        required: true
    },
    level:{
        type: String,
        required: true
    },
    demoUrl:{
        type: String,
        required: true
    },
    benefits: [{title: String}],
    prerequisites: [{title: String}],
    reviews: [reviewSchema],
    courseData: [courseDataSchema],
    ratings:{
        type: Number,
        default: 0,
    },
    purchased:{
        type: Number,
        default: 0
    },
    purchasedBy: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    }]

},
{ timestamps: true }
)

courseSchema.pre('save', function (next) {
    if (this.isModified('price') || this.isNew) {
        const conversionRate = 1 / 87.2121; 
        this.priceUSD = parseFloat((this.price * conversionRate).toFixed(2));
    }
    next();
});

export const courseModel = mongoose.model("Course", courseSchema)