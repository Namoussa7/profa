package com.profa.review;

import com.profa.teacher.TeacherRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

/** Keeps the denormalized rating on the teacher profile in sync with the reviews table. */
@Service
public class RatingService {

    private final ReviewRepository reviews;
    private final TeacherRepository teachers;

    public RatingService(ReviewRepository reviews, TeacherRepository teachers) {
        this.reviews = reviews;
        this.teachers = teachers;
    }

    @Transactional
    public void refresh(UUID teacherUserId) {
        teachers.findByUserId(teacherUserId).ifPresent(p -> {
            p.setRatingAvg(reviews.averageFor(teacherUserId));
            p.setReviewCount((int) reviews.countByTeacherId(teacherUserId));
            teachers.save(p);
        });
    }
}
