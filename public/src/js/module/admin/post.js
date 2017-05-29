/*global $, tinymce*/
// require('../vendor/jquery.poshytip.min');
// require('../vendor/json2');
// require('../../vendor/tinymce/tinymce.min');
// require('../../vendor/tinymce/jquery.tinymce.min');
require('../../vendor/tinymce.full.min');
require('../../lib/jquery.textposition');
require('../../lib/jquery.datepicker');

var service;

service = {
    initEvent: function () {
        $('#post-date').datepicker({
            maxDate: new Date(),
            showOn: 'focus click',
            listenInput: true
        });
        $('#form-post').on('submit', function (e) {
            var $that = $(this);
            $.ajax({
                type: 'post',
                url: $that.attr('action'),
                data: $that.serialize(),
                // contentType: 'application/json',
                dataType: 'json',
                success: function (d, s, xhr) {
                    if (d.code === 0) {
                        location.href = d.data.url;
                    } else {
                        $('#csrfToken').val(d.token);
                        alert(d.message);
                    }
                },
                error: function (xhr, s, err) {
                    return false;
                }
            });
            return false;
        });
        $('#form-post .postStatus').on('click', function (e) {
            if ($('#post-status-password').is(':checked')) {
                $('#post-password-wrap').show();
            } else {
                $('#post-password-wrap').hide();
            }
        });
        // $('#post-content').tinymce({
        tinymce.suffix = '.min';
        tinymce.init({
            selector: '#post-content',
            menubar: false,
            language: 'tinymce_cn',
            plugins: [
                // "charmap print advlist autolink", "searchreplace", "save nonbreaking contextmenu directionality", "emoticons template textpattern imagetools", "spellchecker"
                'lists link image imagetools preview hr anchor pagebreak', 'wordcount visualblocks visualchars code fullscreen', 'insertdatetime media table', 'paste textcolor colorpicker codesample'],
            //styleselect visualchars nonbreaking save cancel charmap emoticons print
            toolbar1: 'fontsizeselect fontselect formatselect | bold italic underline strikethrough | codesample blockquote subscript superscript | alignleft aligncenter alignright alignjustify | bullist numlist',
            toolbar2: 'forecolor backcolor | outdent indent | link anchor image media | table insertdatetime | hr pagebreak | pastetext unlink removeformat | visualblocks code preview fullscreen | undo redo',
            // nonbreaking_force_tab: true,
            image_advtab: true,
            imagetools_toolbar: 'rotateleft rotateright | flipv fliph | editimage imageoptions',
            font_formats: '宋体=宋体;' +
            'Andale Mono=andale mono,times;' +
            'Arial=arial,helvetica,sans-serif;' +
            'Arial Black=arial black,avant garde;' +
            'Book Antiqua=book antiqua,palatino;' +
            'Comic Sans MS=comic sans ms,sans-serif;' +
            'Courier New=courier new,courier;' +
            'Georgia=georgia,palatino;' +
            'Helvetica=helvetica;' +
            'Impact=impact,chicago;' +
            'Symbol=symbol;' +
            'Tahoma=tahoma,arial,helvetica,sans-serif;' +
            'Terminal=terminal,monaco;' +
            'Times New Roman=times new roman,times;' +
            'Trebuchet MS=trebuchet ms,geneva;' +
            'Verdana=verdana,geneva;' +
            'Webdings=webdings;' +
            'Wingdings=wingdings,zapf dingbats',
            height: 400,
            init_instance_callback: function (ed) {
                // $(ed.editorContainer).css('display', 'inline-block');
            }
        });
    }
};

$(function () {
    service.initEvent();
    $('#post-title').focus();
});
