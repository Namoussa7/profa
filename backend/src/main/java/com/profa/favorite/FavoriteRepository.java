package com.profa.favorite;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.*;

public interface FavoriteRepository extends JpaRepository<Favorite, UUID> {
    List<Favorite> findByUserId(UUID userId);
    Optional<Favorite> findByUserIdAndTeacherUserId(UUID userId, UUID teacherUserId);
}
