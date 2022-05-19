#!/usr/bin/env python
# -*- coding: utf-8 -*-

class Question:
    # question_msg must be one line in Question
    # num_of_line_break :
    def __init__(self, question_no, question_msg, error_msg, prefix, 
                 num_of_line_break= 1):
        self.id = question_no
        self.question_msg = question_msg
        self.error_msg = error_msg
        self.prefix = prefix
        self.num_of_line_break = num_of_line_break

    @property
    def display_id(self):
        return 'Q%1d' % self.id

QUESTIONS = [
    Question(1, 
             'Subject (Summarize Commit in one line) Please stop here. ------>|',
             '-> You must enter at least one letter.\n'
             'ex) ~~ problem solved in ~~', 
             '', 
             2),
    Question(2, 
             'Classification (Implementation/Functional Improvement/Error Resolution/'
             'Performance Improvement/Debug/Refactoring/Other). Delimiter:,',
             '-> Input classification. ex) Implementation', 
             'Classification: '),
    Question(3, 
             'Purpose and content of the change - Why did you do this work?',
             '-> You must enter at least one letter.\n'
             'ex) Troubleshooting the Login feature not recognizing strings ($)', 
             'Content:\n'),
    Question(4, 
             'Test case - Procedure for verifying troubleshooting',
             '-> You must enter at least one letter.\n'
             'ex) SQL/Script/Command based reproduction scenarios',
             'Reproduction steps:\n')
]
