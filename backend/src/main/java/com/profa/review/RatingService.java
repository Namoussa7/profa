package com.profa.review;

import com.profa.certification.CertificationService;
import com.profa.teacher.TeacherRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

/** Keeps the denormalized rating on the teacher profile in sync with the reviews table. */
@Service
public class RatingService {

    private final ReviewRepository reviews;
    private final TeacherRepository teachers;
    private final CertificationService certification;

    public RatingService(ReviewRepository reviews, TeacherRepository teachers, CertificationService certification) {
        this.reviews = reviews;
        this.teachers = teachers;
        this.certification = certification;
    }

    @Transactional
    public void refresh(UUID teacherUserId) {
        teachers.findByUserId(teacherUserId).ifPresent(p -> {
            p.setRatingAvg(reviews.averageFor(teacherUserId));
            p.setReviewCount((int) reviews.countByTeacherId(teacherUserId));
            teachers.save(p);
        });
        certification.checkRating(teacherUserId);
    }
}
