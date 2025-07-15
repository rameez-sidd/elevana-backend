const courses = await courseModel.find().select("-courseData.videoUrl -courseData.suggestion -courseData.questions -courseData.links").sort({ createdAt: -1 })

        await redis.set("allCourses", JSON.stringify(courses))