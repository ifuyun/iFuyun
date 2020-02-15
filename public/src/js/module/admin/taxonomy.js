/*global $*/
$(() => {
    // 分类目录列表
    $('.btn-delete').on('click', () => {
        const $that = $(this);
        $.ajax({
            type: 'post',
            url: '/admin/taxonomy/remove?type=' + $that.data('type'),
            data: {
                taxonomyIds: $that.data('taxonomy')
            },
            headers: {
                'X-CSRF-Token': $('#csrfToken').val()
            },
            dataType: 'json',
            success: (d) => {
                if (d.code === 0) {
                    // location.href = d.data.url;
                    window.location.reload();
                } else {
                    alert(d.message);
                }
            },
            error: () => false
        });
        return false;
    });

    // 分类目录表单
    $('#cat-name').focus();
    $('#form-category').on('submit', () => {
        const $that = $(this);
        $.ajax({
            type: 'post',
            url: $that.attr('action'),
            data: $that.serialize(),
            dataType: 'json',
            success: (d) => {
                if (d.code === 0) {
                    location.href = d.data.url;
                } else {
                    $('#csrfToken').val(d.token);
                    alert(d.message);
                }
            },
            error: () => false
        });
        return false;
    });
    $('#form-search').on('submit', () => {
        location.href = $(this).attr('action') + '&' + $(this).serialize();
        return false;
    });
});

module.exports = () => {
};
