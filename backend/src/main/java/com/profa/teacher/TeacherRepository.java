package com.profa.teacher;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.*;

public interface TeacherRepository extends JpaRepository<TeacherProfile, UUID> {
    Optional<TeacherProfile> findByUserId(UUID id);
    List<TeacherProfile> findByVerifiedTrue();
    long countByVerifiedFalse();
    long countByDocumentsCompleteTrue();
    long countByVideoStatus(String status);
    long countBySuspendedTrue();
    long countByCertifiedTrue();
    List<TeacherProfile> findBySuspendedTrue();
    List<TeacherProfile> findTop100ByVideoStatusOrderByUpdatedAtDesc(String status);

    /**
     * Public search, executed in the database with pagination.
     * Text filters are lower-cased "%…%" patterns; '' means "no filter". Numeric filters use -1 for "none".
     */
    @Query("""
            select p from TeacherProfile p
            where p.documentsComplete = true
              and p.suspended = false
              and (:requireCert = false or p.certificationCount > 0)
              and (:certified = false or p.certified = true)
              and (:homeSafe = false or p.homeSafe = true)
              and exists (select 1 from User u where u.id = p.userId and u.enabled = true)
              and (:verified = false or p.verified = true)
              and (:trial = false or p.trialLessonFree = true)
              and (:city = '' or lower(coalesce(p.city,'')) like :city or lower(coalesce(p.district,'')) like :city)
              and (:subject = '' or lower(coalesce(p.subjects,'')) like :subject)
              and (:level = '' or lower(coalesce(p.levels,'')) like :level)
              and (:mode = '' or lower(coalesce(p.teachingModes,'')) like :mode)
              and (:minRate < 0 or p.hourlyRate >= :minRate)
              and (:maxRate < 0 or p.hourlyRate <= :maxRate)
              and (:q = '' or lower(coalesce(p.headline,'')) like :q or lower(coalesce(p.subjects,'')) like :q
                   or lower(coalesce(p.bio,'')) like :q
                   or exists (select 1 from User u2 where u2.id = p.userId and lower(u2.firstName) like :q))
            """)
    Page<TeacherProfile> search(@Param("q") String q, @Param("subject") String subject, @Param("level") String level,
                                @Param("city") String city, @Param("mode") String mode,
                                @Param("minRate") int minRate, @Param("maxRate") int maxRate,
                                @Param("verified") boolean verified, @Param("trial") boolean trial,
                                @Param("requireCert") boolean requireCert, @Param("certified") boolean certified,
                                @Param("homeSafe") boolean homeSafe, Pageable pageable);

    @Query("""
            select p from TeacherProfile p
            where (:q = '' or lower(coalesce(p.headline,'')) like :q or lower(coalesce(p.city,'')) like :q
                   or exists (select 1 from User u where u.id = p.userId and (lower(u.firstName) like :q or lower(u.lastName) like :q or lower(u.email) like :q)))
              and (:filter = '' or (:filter = 'PENDING' and p.verified = false) or (:filter = 'VERIFIED' and p.verified = true)
                   or (:filter = 'INCOMPLETE' and p.documentsComplete = false))
            """)
    Page<TeacherProfile> adminSearch(@Param("q") String q, @Param("filter") String filter, Pageable pageable);
}
