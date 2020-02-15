/*global jQuery,document,window*/
/**
 * 定制化日期控件
 * @author fuyun
 * @version 2015-04-21
 * @since 2014-01-27
 */
(function ($) {
    var htmlTpl = '';
    htmlTpl = '<div class="datepicker" style="display:none;">';
    htmlTpl += '<div class="controlDiv">';
    htmlTpl += '    <div class="prevYear">&nbsp;</div>';
    htmlTpl += '    <div class="prevMonth">&nbsp;</div>';
    htmlTpl += '    <div class="monthMenu">';
    htmlTpl += '        <div class="monthTitle"></div>';
    htmlTpl += '        <div style="display:none;"><input class="monthInput" maxlength="2" value="" /></div>';
    htmlTpl += '        <div class="monthDiv" style="display:none;"><table class="monthTable" cellpadding="0" cellspacing="0" border="0">';
    htmlTpl += '        </table></div>';
    htmlTpl += '    </div>';
    htmlTpl += '    <div class="yearMenu">';
    htmlTpl += '        <div class="yearTitle"></div>';
    htmlTpl += '        <div style="display:none;"><input class="yearInput" maxlength="4" value="" /></div>';
    htmlTpl += '        <div class="yearDiv" style="display:none;"><table class="yearTable" cellpadding="0" cellspacing="0" border="0">';
    htmlTpl += '        </table><table class="yearBtnTable" cellpadding="0" cellspacing="0" border="0">';
    htmlTpl += '            <tr><td class="prevTenYears">←</td><td class="closeYear">×</td><td class="nextTenYears">→</td></tr>';
    htmlTpl += '        </table></div>';
    htmlTpl += '    </div>';
    htmlTpl += '    <div class="nextMonth">&nbsp;</div>';
    htmlTpl += '    <div class="nextYear">&nbsp;</div>';
    htmlTpl += '</div>';
    htmlTpl += '<div class="dateDiv">';
    htmlTpl += '    <table width="100%" cellpadding="0" cellspacing="0" border="0">';
    htmlTpl += '    </table>';
    htmlTpl += '</div>';
    htmlTpl += '</div>';

    // require('textPosition');

    $.Datepicker = function (elm, options) {
        this.$elm = $(elm);
        this.opts = $.extend({}, $.fn.datepicker.defaults, options);
        // 不限制在0-6
        this.opts.firstDay = this.opts.firstDay % 7;
        this.$picker = $(htmlTpl).appendTo(document.body);
        this.init();
    };

    // 是否已初始化
    $.Datepicker.initialized = false;
    // 当前实例
    $.Datepicker.curInst = null;
    // 全局事件
    $.Datepicker.initGlobalEvent = function () {
        $(document).mousedown(function (e) {
            // 单击页面不同地方时，隐藏日期控件或月份、年份选择框
            // 以全局而非实例的方式定义，避免重复绑定事件，从而导致调用多次事件回调
            // 根据元素HTML判断，需要保证绑定的不同元素的HTML不一致，通常情况，通过id或name区分，否则，在同时绑定focus和click时，在mousedown事件触发时会重新显示日期控件（即先隐藏再显示）
            var $target = $(e.target), that = $.Datepicker.curInst, $picker;
            if (that) {
                $picker = that.$picker;
                if ($target.get(0).outerHTML !== that.$elm.get(0).outerHTML && !$target.is('.datepicker') && $target.parents('.datepicker').length < 1) {
                    return that.processError();
                }
                if ($picker.find('.monthDiv')
                    .is(':visible') && (!$target.is('.monthDiv') && $target.parents('.monthDiv').length < 1 && !$target.is('.monthInput'))) {
                    that.hideMonthTable();
                }
                if ($picker.find('.yearDiv')
                    .is(':visible') && (!$target.is('.yearDiv') && $target.parents('.yearDiv').length < 1 && !$target.is('.yearInput'))) {
                    that.hideYearTable();
                }
            }
        });
    };

    $.Datepicker.prototype = {
        dateFormatReg: /^\d{4}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12][0-9]|3[01])$/i,
        init: function () {
            if (!$.Datepicker.initialized) {
                $.Datepicker.initGlobalEvent();
                $.Datepicker.initialized = true;
            }
            this.initInputEvent();
            this.initPickerEvent();
        },
        initInputEvent: function () {// 输入事件
            var that;
            that = this;
            this.$elm.on(this.opts.showOn, function (e) {
                // 更改当前实例
                $.Datepicker.curInst = that;
                that.show();
            });
            if (this.opts.listenInput) {
                this.$elm.on('keyup', function (e) {
                    // 用于自动填充月份和日期的前导零
                    // TODO: 需要处理一直连续输入未释放按键的情况
                    var keyCode, curVal, posObj;
                    keyCode = e.which;
                    curVal = $(this).val();
                    posObj = $(this).textposition();

                    if ((keyCode > 95 && keyCode < 106) || (keyCode > 47 && keyCode < 58)) {// 0-9
                        if ((posObj.start === 4 || posObj.start === 7)) {// 自动填充-号
                            if (curVal.charAt(posObj.start) !== '-') {// 后一字符非-号才填充
                                $(this).textposition('-');
                                $(this).moveposition(posObj.start, 1);
                            }
                        }
                        posObj = $(this).textposition();
                        // 重新获取value值
                        curVal = $(this).val();
                        if (posObj.start === 6) {
                            if (parseInt(curVal.charAt(5), 10) > 1 && !/^\d$/i.test(curVal.charAt(6))) {// 后一字符非数字时
                                $(this).moveposition(posObj.start, -1);
                                // {5,6}
                                $(this).textposition('0');
                                // IE8-下修改时，修改月份后光标会移到末尾，而不是停留在当前位置的后一个字符，即位置从{5,6}到{10,10}，而不是{7,7}，但初始输入时正常
                                // 故针对IE8-需要重置光标位置为{1,7}
                                $(this).moveposition(1 - posObj.start, 1);
                                if (!$.support.leadingWhitespace) {// 针对IE8-修改时
                                    // {8,8}
                                    $(this).moveposition(posObj.start, 0);
                                } else {// 正常情况
                                    $(this).moveposition(posObj.start, 1);
                                }

                                if ($(this).val().charAt(posObj.start + 1) !== '-') {// 修改时
                                    $(this).textposition('-');
                                    $(this).moveposition(posObj.start + 1, 1);
                                }
                            }
                        }
                        if (posObj.start === 9) {
                            if (parseInt(curVal.charAt(8), 10) > 3 && !/^\d$/i.test(curVal.charAt(9))) {// 后一字符非数字时
                                $(this).moveposition(posObj.start, -1);
                                $(this).textposition('0');
                                $(this).moveposition(posObj.start, 1);
                            }
                        }
                    }
                }).on('keydown', function (e) {
                    // TODO: 需考虑修改情况，此时输入的内容应替换原有的后一字符的内容
                    // 控制字符在前
                    var keyCode, posObj;
                    keyCode = e.which;
                    $(this).val();
                    posObj = $(this).textposition();
                    if (keyCode === 8 || keyCode === 46) {// <--,Delete
                        return true;
                    }
                    if (keyCode === 37 || keyCode === 39) {// <-,->
                        return true;
                    }
                    if (keyCode === 36 || keyCode === 35) {// Home,End
                        return true;
                    }
                    if (keyCode === 13) {// Enter
                        that.hide();
                        return true;
                    }
                    if (keyCode === 9) {// Tab
                        that.hide();
                        return true;
                    }
                    // if (keyCode === 9) {//修改Tab默认行为，将焦点移至月份选择框
                    // $picker.find('.monthTitle').hide().siblings().show();
                    // $picker.find('.monthInput').focus().moveposition(0, 2, true);
                    // return false;
                    // }
                    if ((keyCode > 95 && keyCode < 106) || (keyCode > 47 && keyCode < 58)) {// 0-9
                        return true;
                    }
                    if (keyCode === 109 || keyCode === 173) {// -
                        return !(posObj.start !== 4 && posObj.start !== 7);// 非正常位置禁止输入-号
                    }
                    return false;
                });
            }
        },
        initPickerEvent: function () {// 日期控件事件，定义控件行为
            var that, $picker;
            that = this;
            $picker = this.$picker;

            $picker.on('mouseover mouseout', '.dateDiv td.pickDay', function (e) {
                $(this).toggleClass('hover');
            }).on('mouseover mouseout', '.monthDiv td.pickMonth,.yearDiv td.pickYear', function (e) {
                $(this).toggleClass('menuHover');
            }).on('keydown', '.monthInput,.yearInput', function (e) {
                if (e.which === 9) {// 修改Tab默认行为，将焦点移至输入框
                    that.$elm.focus();
                    that.hideMonthTable();
                    that.hideYearTable();
                    return false;
                }
            }).on('click', '.dateDiv td.pickDay', function (e) {// 选中日期
                var actDay = parseInt($(this).html(), 10);
                if (isNaN(actDay) || actDay < 1) {
                    return false;
                }
                that.setDateValue(parseInt($picker.find('.yearInput').val(), 10), parseInt($picker.find('.monthInput').val(), 10), actDay);
                $(this).addClass('active').siblings().removeClass('active').end().parent().siblings().find('td').removeClass('active');

                that.hide();

                if (typeof that.opts.onSelect === 'function') {
                    that.opts.onSelect.call(that);
                }
            }).on('click', '.monthTitle', function (e) {// 切换月份选择
                $(this).hide().siblings().show();
                $picker.find('.monthInput').focus().moveposition(0, 2, true);
            }).on('click', '.yearTitle', function (e) {// 切换年份选择
                $(this).hide().siblings().show();
                $picker.find('.yearInput').focus().moveposition(0, 4, true);
            }).on('click', '.monthTable td.pickMonth', function (e) {// 选中月份
                // 为避免使用自定义属性，可以将months改为对象，通过遍历读取键名、键值
                // 待增加回车事件
                var actYear, actMonth, actDay, monthDays;
                actYear = parseInt($picker.find('.yearInput').val(), 10);
                actMonth = parseInt($(this).attr('monthData'), 10);
                actDay = parseInt($picker.find('.active').html(), 10);
                monthDays = that.getMonthDays(actYear, actMonth);
                actDay = actDay > monthDays ? monthDays : actDay;

                $picker.find('.monthInput').val(actMonth);
                $picker.find('.monthTitle').html($(this).html());

                that.hideMonthTable();
                that.refresh(actYear, actMonth, actDay);
            }).on('click', '.yearTable td.pickYear', function (e) {// 选择年份
                // 待增加回车事件
                var actYear, actMonth, actDay, monthDays, minDate, maxDate;
                actYear = parseInt($(this).html(), 10);
                actMonth = parseInt($picker.find('.monthInput').val(), 10);
                actDay = parseInt($picker.find('.active').html(), 10);
                minDate = that.getDateObj(that.opts.minDate);
                maxDate = that.getDateObj(that.opts.maxDate);
                monthDays = that.getMonthDays(actYear, actMonth);
                actDay = actDay > monthDays ? monthDays : actDay;

                $picker.find('.yearInput').val(actYear);
                $picker.find('.yearTitle').html(actYear);

                that.hideYearTable();

                if (actYear === minDate.year) {
                    if (actMonth < minDate.month) {// 设为最小月份
                        actMonth = minDate.month;
                    }
                    if (actMonth === minDate.month && actDay < minDate.day) {// 设为最小日
                        actDay = minDate.day;
                    }
                }
                if (actYear === maxDate.year) {
                    if (actMonth > maxDate.month) {// 设为最大月份
                        actMonth = maxDate.month;
                    }
                    if (actMonth === maxDate.month && actDay > maxDate.day) {// 设为最大日
                        actDay = maxDate.day;
                    }
                }
                that.refresh(actYear, actMonth, actDay);
            }).on('click', '.closeYear', function (e) {// 隐藏年份
                that.hideYearTable();
            }).on('click', '.prevTenYears.ctrlYear', function (e) {// 前十年
                // 待加日期范围限制
                $picker.find('.yearTable').html(that.getYearTable(parseInt($(this).parents('.yearDiv').find('td:first').html(), 10) - 5));
            }).on('click', '.nextTenYears.ctrlYear', function (e) {// 后十年
                // 待加日期范围限制
                $picker.find('.yearTable').html(that.getYearTable(parseInt($(this).parents('.yearDiv').find('td:first').html(), 10) + 15));
            }).on('click', '.prevYear', function (e) {// 上一年
                var actYear, actMonth, actDay, monthDays, minDate;
                actYear = parseInt($picker.find('.yearInput').val(), 10) - 1;
                actMonth = parseInt($picker.find('.monthInput').val(), 10);
                actDay = parseInt($picker.find('.active').html(), 10);
                minDate = that.getDateObj(that.opts.minDate);
                if (actYear < minDate.year || (actYear === minDate.year && actMonth < minDate.month)) {// 大于当前年或大于当前月
                    // 不是直接返回，而是设为最小日期
                    that.refresh(minDate.year, minDate.month, actDay > minDate.day ? actDay : minDate.day);
                    return false;
                }
                monthDays = that.getMonthDays(actYear, actMonth);
                that.refresh(actYear, actMonth, actDay > monthDays ? monthDays : actDay);
            }).on('click', '.prevMonth', function (e) {// 上月
                var actYear, actMonth, actDay, monthDays, minDate;
                actYear = parseInt($picker.find('.yearInput').val(), 10);
                actMonth = parseInt($picker.find('.monthInput').val(), 10);
                actDay = parseInt($picker.find('.active').html(), 10);
                minDate = that.getDateObj(that.opts.minDate);
                if (actMonth === 1) {
                    actMonth = 12;
                    actYear -= 1;
                } else {
                    actMonth -= 1;
                }
                if (actYear < minDate.year || (actYear === minDate.year && actMonth <= minDate.month)) {
                    that.refresh(minDate.year, minDate.month, actDay > minDate.day ? actDay : minDate.day);
                    return false;
                }
                monthDays = that.getMonthDays(actYear, actMonth);
                that.refresh(actYear, actMonth, actDay > monthDays ? monthDays : actDay);
            }).on('click', '.nextMonth', function (e) {// 下月
                var actYear, actMonth, actDay, monthDays, maxDate;
                actYear = parseInt($picker.find('.yearInput').val(), 10);
                actMonth = parseInt($picker.find('.monthInput').val(), 10);
                actDay = parseInt($picker.find('.active').html(), 10);
                maxDate = that.getDateObj(that.opts.maxDate);
                if (actMonth === 12) {
                    actMonth = 1;
                    actYear += 1;
                } else {
                    actMonth += 1;
                }
                if (actYear > maxDate.year || (actYear === maxDate.year && actMonth >= maxDate.month)) {
                    that.refresh(maxDate.year, maxDate.month, actDay < maxDate.day ? actDay : maxDate.day);
                    return false;
                }
                monthDays = that.getMonthDays(actYear, actMonth);
                that.refresh(actYear, actMonth, actDay = actDay > monthDays ? monthDays : actDay);
            }).on('click', '.nextYear', function (e) {// 下一年
                var actYear, actMonth, actDay, monthDays, maxDate;
                actYear = parseInt($picker.find('.yearInput').val(), 10) + 1;
                actMonth = parseInt($picker.find('.monthInput').val(), 10);
                actDay = parseInt($picker.find('.active').html(), 10);
                maxDate = that.getDateObj(that.opts.maxDate);
                if (actYear > maxDate.year || (actYear === maxDate.year && actMonth > maxDate.month)) {// 大于当前年或大于当前月
                    // 不是直接返回，而是设为最大日期
                    that.refresh(maxDate.year, maxDate.month, actDay < maxDate.day ? actDay : maxDate.day);
                    return false;
                }
                monthDays = that.getMonthDays(actYear, actMonth);
                that.refresh(actYear, actMonth, actDay > monthDays ? monthDays : actDay);
            });
        },
        refresh: function (year, month, day) {// 根据指定日期刷新控件
            var $picker = this.$picker;
            $picker.find('.yearInput').val(year);
            $picker.find('.monthInput').val(month);
            this.setDateValue(year, month, day);
            this.showByDate(this.getActiveDate());
        },
        setDateValue: function (year, month, day) {// 设置为指定日期
            this.$elm.val(year + '-' + (month < 10 ? '0' + month : month) + '-' + (day < 10 ? '0' + day : day));
        },
        show: function () {// 显示控件，取输入框的值或当前日期（无值时）
            if (this.$picker.is(':hidden')) {
                this.showByDate(this.getActiveDate());
                this.setPos();
            }
        },
        hide: function () {// 隐藏控件
            this.$picker.hide();
        },
        calcPos: function () {// 位置计算
        },
        setPos: function () {// 设置显示位置
            var $elm, elmOffset, posObj;
            $elm = this.$elm;
            elmOffset = $elm.offset();
            posObj = {
                l: elmOffset.left,
                t: elmOffset.top,
                w: $elm.outerWidth(),
                h: $elm.outerHeight()
            };
            this.$picker.css({
                'left': posObj.l,
                'top': posObj.t + posObj.h,
                'position': 'absolute'
            });
        },
        showByDate: function (dateObj) {// 根据指定日期显示控件
            var $picker, curDateObj;
            $picker = this.$picker;
            curDateObj = this.getCurDate();

            $picker.find('.monthTitle').html(dateObj.curMonthName);
            $picker.find('.monthInput').val(dateObj.curMonth);
            $picker.find('.yearTitle').html(dateObj.curYear);
            $picker.find('.yearInput').val(dateObj.curYear);
            $picker.find('.monthTable').html(this.getMonthTable(dateObj.curYear));
            $picker.find('.yearTable').html(this.getYearTable(dateObj.curYear));
            $picker.find('.dateDiv table').html(this.getDateTable(curDateObj, dateObj, this.getWeekByDate(dateObj.curYear, dateObj.curMonth, 1)));

            this.hideMonthTable();
            this.hideYearTable();
            $picker.show();
        },
        hideMonthTable: function () {// 隐藏月份选择
            // TODO: 需要重置值，否则隐藏后重新显示会是最近输入的值而不是对应当前日期的月份
            this.$picker.find('.monthTitle').show().siblings().hide();
        },
        hideYearTable: function () {// 隐藏年份选择
            // TODO: 需要重置值，否则隐藏后重新显示会是最近输入的值而不是对应当前日期的年份
            this.$picker.find('.yearTitle').show().siblings().hide();
        },
        refreshYearCtrl: function (actYear) {// 刷新前、后十年控制按钮
            var $picker, minDate, maxDate;
            $picker = this.$picker;
            minDate = this.getDateObj(this.opts.minDate);
            maxDate = this.getDateObj(this.opts.maxDate);

            // 先清除样式
            $picker.find('.prevTenYears,.nextTenYears').removeClass('ctrlYear invalid');
            // 重新设置样式
            if (actYear - 6 >= minDate.year) {
                $picker.find('.prevTenYears').addClass('ctrlYear');
            } else {
                $picker.find('.prevTenYears').addClass('invalid');
            }
            if (actYear + 5 <= maxDate.year) {
                $picker.find('.nextTenYears').addClass('ctrlYear');
            } else {
                $picker.find('.nextTenYears').addClass('invalid');
            }
        },
        getMonthTable: function (actYear) {// 生成月份表格
            // 待加日期范围限制
            var i, tblHtml, monthClass, minDate, maxDate;
            tblHtml = '';
            minDate = this.getDateObj(this.opts.minDate);
            maxDate = this.getDateObj(this.opts.maxDate);
            for (i = 0; i < 6; i += 1) {
                // 重置
                monthClass = [];
                if ((actYear === minDate.year && (i + 1) < minDate.month) || (actYear === maxDate.year && (i + 1) > maxDate.month)) {
                    monthClass.push('invalid');
                } else {
                    monthClass.push('pickMonth');
                }
                tblHtml += '<tr><td class="' + monthClass.join(' ') + '" monthData="' + (i + 1) + '">' + this.opts.months[i] + '</td>';

                // 重置
                monthClass = [];
                if ((actYear === minDate.year && (i + 7) < minDate.month) || (actYear === maxDate.year && (i + 7) > maxDate.month)) {
                    monthClass.push('invalid');
                } else {
                    monthClass.push('pickMonth');
                }
                tblHtml += '<td class="' + monthClass.join(' ') + '" monthData="' + (i + 7) + '">' + this.opts.months[i + 6] + '</td></tr>';
            }
            return tblHtml;
        },
        getYearTable: function (actYear) {// 生成年份表格
            // 待加日期范围限制
            var i, tblHtml, yearClass, minDate, maxDate;
            tblHtml = '';
            minDate = this.getDateObj(this.opts.minDate);
            maxDate = this.getDateObj(this.opts.maxDate);
            for (i = 0; i < 5; i += 1) {
                // 重置
                yearClass = [];
                if ((actYear + i - 5) < minDate.year || (actYear + i - 5) > maxDate.year) {
                    yearClass.push('invalid');
                } else {
                    yearClass.push('pickYear');
                }
                tblHtml += '<tr><td class="' + yearClass.join(' ') + '">' + (actYear + i - 5) + '</td>';

                // 重置
                yearClass = [];
                if ((actYear + i) < minDate.year || (actYear + i) > maxDate.year) {
                    yearClass.push('invalid');
                } else {
                    yearClass.push('pickYear');
                }
                tblHtml += '<td class="' + yearClass.join(' ') + '">' + (actYear + i) + '</td></tr>';
            }

            this.refreshYearCtrl(actYear);

            return tblHtml;
        },
        getDateTable: function (curDateObj, actDateObj, firstWeek) {// 生成日期表格
            // @formatter:off
            var weekNames, $picker, i, tblHtml, year, month, day, monthDays, isCurYearMonth, isActYearMonth, dayClass, minDate, maxDate;
            weekNames = this.opts.weekNames;
            $picker = this.$picker;
            tblHtml = '';
            year = actDateObj.curYear;
            month = actDateObj.curMonth;
            day = actDateObj.curDay;
            monthDays = this.getMonthDays(year, month);
            Math.ceil(monthDays / 7);
            dayClass = [];
            minDate = this.getDateObj(this.opts.minDate);
            maxDate = this.getDateObj(this.opts.maxDate);
            // @formatter:on

            // 生成星期表头
            tblHtml += '<tr class="weekTitle">';
            for (i = this.opts.firstDay; i < weekNames.length; i += 1) {
                tblHtml += '<th>' + weekNames[i] + '</th>';
            }
            for (i = 0; i < this.opts.firstDay; i += 1) {
                tblHtml += '<th>' + weekNames[i] + '</th>';
            }
            tblHtml += '</tr>';

            firstWeek = firstWeek >= this.opts.firstDay ? firstWeek : firstWeek + 7;
            isCurYearMonth = $picker.find('.yearInput').val() === curDateObj.curYear.toString() && $picker.find('.monthInput')
                .val() === curDateObj.curMonth.toString();
            isActYearMonth = $picker.find('.yearInput').val() === year.toString() && $picker.find('.monthInput').val() === month.toString();

            // 生成日期
            tblHtml += '<tr>';
            for (i = this.opts.firstDay; i < firstWeek; i += 1) {
                tblHtml += '<td>&nbsp;</td>';
            }
            for (i = 1; i <= monthDays; i += 1) {
                dayClass = [];
                // @formatter:off
                if ((minDate && (minDate.year > year || (minDate.year === year && minDate.month > month) || (minDate.year === year && minDate.month === month && minDate.day > i))) ||
                    (maxDate && (maxDate.year < year || (maxDate.year === year && maxDate.month < month) || (maxDate.year === year && maxDate.month === month && maxDate.day < i)))) {
                    dayClass.push('invalid');
                } else {
                    dayClass.push('pickDay');
                }
                // @formatter:on
                if (i === day && isActYearMonth) {
                    dayClass.push('active');
                }
                if (i === curDateObj.curDay && isCurYearMonth) {
                    dayClass.push('today');
                }
                tblHtml += '<td class="' + dayClass.join(' ') + '">' + i + '</td>';
                if ((i + firstWeek - this.opts.firstDay) % 7 === 0) {
                    tblHtml += '</tr>';
                    tblHtml += '<tr>';
                }
            }
            for (i = 0; i < (7 - (monthDays + firstWeek - this.opts.firstDay) % 7) % 7; i += 1) {
                tblHtml += '<td>&nbsp;</td>';
            }
            tblHtml += '</tr>';

            return tblHtml;
        },
        getCurDate: function () {// 返回当前日期
            var curDate = new Date();
            return {
                curYear: curDate.getFullYear(),
                curMonth: curDate.getMonth() + 1,
                curMonthName: this.opts.months[curDate.getMonth()],
                curDay: curDate.getDate(),
                curWeek: curDate.getDay()
            };
        },
        getActiveDate: function () {// 返回当前选择的日期
            var dateStr, dateArr;
            dateStr = this.$elm.val();
            dateArr = [];
            if (this.dateFormatReg.test(dateStr)) {
                dateArr = dateStr.split('-');
                dateArr[0] = parseInt(dateArr[0], 10);
                dateArr[1] = parseInt(dateArr[1], 10);
                dateArr[2] = parseInt(dateArr[2], 10);
                return {
                    curYear: dateArr[0],
                    curMonth: dateArr[1],
                    curMonthName: this.opts.months[dateArr[1] - 1],
                    curDay: dateArr[2],
                    curWeek: this.getWeekByDate(dateArr[0], dateArr[1] - 1, dateArr[2])
                };
            }

            return this.getCurDate();
        },
        getWeekByDate: function (year, month, day) {// 返回指定日期的星期值
            return new Date(year, month - 1, day).getDay();
        },
        isLeapYear: function (year) {// 判断是否闰年
            return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
        },
        getMonthDays: function (year, month) {// 返回指定月份天数
            switch (month) {
                case 1:
                case 3:
                case 5:
                case 7:
                case 8:
                case 10:
                case 12:
                    return 31;
                case 4:
                case 6:
                case 9:
                case 11:
                    return 30;
                case 2:
                    return this.isLeapYear(year) ? 29 : 28;
            }
        },
        getDateObj: function (mixDate) {// 解析日期对象，返回年月日，支持Date、字符串、数值类型
            var dateType, rawDateType, dateObj, tmpArr;
            dateType = typeof mixDate;
            rawDateType = Object.prototype.toString.call(mixDate);
            dateObj = null;
            tmpArr = [];
            if (dateType === 'string' && this.dateFormatReg.test(mixDate)) {
                dateObj = {};
                tmpArr = mixDate.split('-');
                dateObj.year = parseInt(tmpArr[0], 10);
                dateObj.month = parseInt(tmpArr[1], 10);
                dateObj.day = parseInt(tmpArr[2], 10);
            } else if (rawDateType === '[object Date]') {
                dateObj = {
                    year: mixDate.getFullYear(),
                    month: mixDate.getMonth() + 1,
                    day: mixDate.getDate()
                };
            } else if (dateType === 'number' || rawDateType === '[object Number]') {
                mixDate = new Date(mixDate);
                dateObj = {
                    year: mixDate.getFullYear(),
                    month: mixDate.getMonth() + 1,
                    day: mixDate.getDate()
                };
            }
            return dateObj;
        },
        getLimitDates: function () {// 外观方法，统一获取日期范围对象
            return {
                minDate: this.getDateObj(this.opts.minDate),
                maxDate: this.getDateObj(this.opts.maxDate)
            };
        },
        processError: function () {
            // 错误处理，结合hide调用，即一般需要关闭时间选择框
            var opts, $elm, isValid, actDateStr, actDateObj, minDate, maxDate, returnVal;
            opts = this.opts;
            $elm = this.$elm;
            isValid = false;
            actDateStr = $.trim($elm.val());
            minDate = this.getDateObj(opts.minDate);
            maxDate = this.getDateObj(opts.maxDate);
            returnVal = true;

            if (actDateStr === '') {// || ($elm.attr('placeholder') && $elm.attr('placeholder') === actDateStr)
                isValid = true;
            } else if (this.dateFormatReg.test(actDateStr)) {
                actDateObj = this.getActiveDate();
                // @formatter:off
                if ((actDateObj.curYear > minDate.year || (actDateObj.curYear === minDate.year && actDateObj.curMonth > minDate.month) ||
                    (actDateObj.curYear === minDate.year && actDateObj.curMonth === minDate.month && actDateObj.curDay >= minDate.day)) &&
                    (actDateObj.curYear < maxDate.year || (actDateObj.curYear === maxDate.year && actDateObj.curMonth < maxDate.month) ||
                        (actDateObj.curYear === maxDate.year && actDateObj.curMonth === maxDate.month && actDateObj.curDay <= maxDate.day))) {
                    isValid = true;
                }
                // @formatter:on
            }

            if (isValid) {
                this.hide();
            } else {
                switch (opts.errMode) {
                    case 'alert':
                        window.alert(opts.errMessage);
                        $elm.focus();
                        break;
                    case 'confirm':
                        if (window.confirm(opts.errConfirmMsg)) {
                            $elm.val('').focus();
                        } else {
                            $elm.focus();
                        }
                        break;
                    case 'clear':
                        // 因为监听的mousedown事件无法成功执行focus，需要阻止事件的默认行为和冒泡，故返回false
                        $elm.val('').focus();
                        returnVal = false;
                        break;
                    case 'custom':
                        if (typeof opts.errHandler === 'function') {
                            returnVal = opts.errHandler.call(this);
                            returnVal = returnVal === undefined ? true : returnVal;
                        }
                        break;
                    default:
                        this.hide();
                }
            }

            // 返回false将无法移开焦点，默认返回true
            return returnVal;
        }
    };
    $.fn.datepicker = function (options) {
        var opts = $.extend({}, $.fn.datepicker.defaults, options);

        return this.each(function () {
            return new $.Datepicker(this, opts);
        });
    };
    $.fn.datepicker.defaults = {
        dateFormat: 'Y-m-d', // TODO: 日期格式
        minDate: '1900-01-01', // 日期最小值
        maxDate: '2099-12-31', // 日期最大值
        firstDay: 0, // 起始星期值，0为星期日
        onSelect: null, // 日期选择事件回调
        showOn: 'focus', // 触发日期控件事件类型
        listenInput: true,
        errMode: 'confirm', // 错误模式：alert, confirm, clear, custom, none
        errHandler: null, // 自定义错误处理函数，仅在errMode为custom时有效
        errMessage: '不合法的日期格式或者日期超出限定范围', // 错误提示消息
        errConfirmMsg: '不合法的日期格式或者日期超出限定范围,需要撤销吗?', // 错误确认消息，errMode为confirm时有效
        weekNames: ['日', '一', '二', '三', '四', '五', '六'], // 星期显示文本，与firstDay对应
        months: ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一', '十二']// 月份显示文本
    };
}(jQuery));
