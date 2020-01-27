/*global $*/
$(function () {
    $('#form-settings').on('submit', function () {
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
