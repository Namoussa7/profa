package com.profa.common;

import org.springframework.data.domain.Page;

import java.util.List;
import java.util.function.Function;

/** Stable JSON shape for paginated lists (independent of Spring's Page serialization). */
public record PageResponse<T>(List<T> content, int page, int size, long totalElements, int totalPages) {

    public static <E, T> PageResponse<T> of(Page<E> p, Function<E, T> map) {
        return new PageResponse<>(p.getContent().stream().map(map).toList(), p.getNumber(), p.getSize(), p.getTotalElements(), p.getTotalPages());
    }

    public static <T> PageResponse<T> of(Page<T> p) {
        return new PageResponse<>(p.getContent(), p.getNumber(), p.getSize(), p.getTotalElements(), p.getTotalPages());
    }

    /** Clamps client-provided page sizes. */
    public static int size(Integer requested, int def) {
        if (requested == null || requested < 1) return def;
        return Math.min(requested, 100);
    }
}
