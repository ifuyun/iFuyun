/*global $*/
$(function () {
    // 评论列表
    function sendAction(action, commentId) {
        $.ajax({
            type: 'post',
            url: '/admin/comment/status',
            data: {
                action: action,
                commentId: commentId
            },
            headers: {
                'X-CSRF-Token': $('#csrfToken').val()
            },
            dataType: 'json',
            success: function (d) {
                if (d.code === 0) {
                    window.location.reload();
                } else {
                    alert(d.message);
                }
            },
            error: function () {
                return false;
            }
        });
    }

    $('.btn-approve').on('click', function () {
        sendAction('approve', $(this).attr('data-id'));
        return false;
    });
    $('.btn-reject').on('click', function () {
        sendAction('reject', $(this).attr('data-id'));
        return false;
    });
    $('.btn-spam').on('click', function () {
        sendAction('spam', $(this).attr('data-id'));
        return false;
    });
    $('.btn-delete').on('click', function () {
        sendAction('delete', $(this).attr('data-id'));
        return false;
    });

    // 评论表单
    $('.j-focus:first').focus();
    $('#form-comment').on('submit', function () {
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
            error: function () {
                return false;
            }
        });
        return false;
    });
});

module.exports = () => {
};
