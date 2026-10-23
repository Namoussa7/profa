package com.profa.job;

import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.*;

public interface JobRepository extends JpaRepository<JobOffer, UUID> {
    List<JobOffer> findByStatus(String status);
    List<JobOffer> findByStatusOrderByCreatedAtDesc(String status);
    List<JobOffer> findBySchoolIdOrderByCreatedAtDesc(UUID schoolId);
    long countByStatus(String status);

    /** Open offers filtered in SQL ('' = no filter, values are lower-cased "%…%" patterns). */
    @Query("""
            select j from JobOffer j where j.status = 'OPEN'
              and (:city = '' or lower(coalesce(j.city,'')) like :city)
              and (:subject = '' or lower(coalesce(j.subject,'')) like :subject)
              and (:contract = '' or lower(coalesce(j.contractType,'')) like :contract)
              and (:q = '' or lower(coalesce(j.title,'')) like :q or lower(coalesce(j.subject,'')) like :q
                   or lower(coalesce(j.description,'')) like :q)
            order by j.createdAt desc
            """)
    List<JobOffer> searchOpen(@Param("q") String q, @Param("city") String city, @Param("subject") String subject,
                              @Param("contract") String contract, Pageable pageable);
}
