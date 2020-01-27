/*global $*/
$(function () {
    // 标签列表
    $('.btn-delete').on('click', function () {
        const $that = $(this);
        $.ajax({
            type: 'post',
            url: '/admin/category/remove',
            data: {
                termId: $that.attr('data-term'),
                taxonomyId: $that.attr('data-taxonomy')
            },
            headers: {
                'X-CSRF-Token': $('#csrfToken').val()
            },
            dataType: 'json',
            success: function (d) {
                if (d.code === 0) {
                    // location.href = d.data.url;
                    window.location.reload();
                } else {
                    alert(d.message);
                }
            },
            error: function () {
                return false;
            }
        });
        return false;
    });

    // 标签表单
    $('#cat-name').focus();
    $('#form-category').on('submit', function () {
        const $that = $(this);
        $.ajax({
            type: 'post',
            url: $that.attr('action'),
            data: $that.serialize(),
            dataType: 'json',
            success: function (d) {
                if (d.code === 0) {
                    location.href = d.data.url;
                } else {
                    $('#csrfToken').val(d.token);
                    alert(d.message);
                }
            },
            error: function (xhr) {
                try {
                    const result = JSON.parse(xhr.responseText);
                    if (result.code !== 200) {
                        alert(result.message);
                    }
                } catch (e) {
                    alert('未知错误');
                }
                return false;
            }
        });
        return false;
    });
});

module.exports = () => {
};
